"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Camera, CarFront, CircleDollarSign, MapPin, PackageCheck, Ruler, ScanLine } from "lucide-react";

import {
  createProductAction,
  prepareProductImageUploadsAction,
  updateProductAction,
  type PreparedProductUpload,
} from "@/app/(protected)/seller/actions";
import { SellerFormAlert } from "@/components/seller/seller-form-alert";
import { VehicleSearch } from "@/components/marketplace/vehicle-search";
import {
  initialSellerActionState,
  type SellerActionState,
} from "@/lib/marketplace/seller-action-state";
import { SellerSubmitButton } from "@/components/seller/seller-submit-button";
import { Input } from "@/components/ui/input";
import {
  productConditions,
  requiredProductImageSlots,
  validateProductImage,
} from "@/lib/marketplace/products";
import type { ProductCategoryOption } from "@/lib/marketplace/seller-data";
import type { MarketplaceVehicleMakeOption } from "@/lib/marketplace/search-options";
import type { ProductCondition, ProductImageType } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import { getProductFormValues, productFormSchema } from "@/lib/validation/seller";
import { cn } from "@/lib/utils";

export type ProductFormDefaults = {
  actualItemType?: ProductImageType;
  brand: string;
  categoryId: string;
  city: string;
  condition: ProductCondition;
  crossReferences: string;
  deliveryAvailable: boolean;
  deliveryFeeNgn: string;
  description: string;
  fitmentIds: string[];
  heightCm?: string;
  imageTypes: ProductImageType[];
  manufacturerPartNumber: string;
  name: string;
  oemPartNumber: string;
  pickupAvailable: boolean;
  pickupLocationId?: string;
  packagingWeightGrams?: number;
  priceNgn: string;
  productId?: string;
  quantity: number;
  sku: string;
  state: string;
  isBulky?: boolean;
  isFragile?: boolean;
  lengthCm?: string;
  weightKg?: string;
  widthCm?: string;
};

export type PickupLocationOption = {
  id: string;
  isDefault: boolean;
  label: string;
  lga: string;
  town: string;
};

const labelClass = "mb-2 block text-sm font-semibold text-stone-800";
const selectClass =
  "flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring";
const textareaClass =
  "min-h-32 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none transition-colors placeholder:text-stone-400 focus-visible:ring-2 focus-visible:ring-ring";

function FieldError({ errors, id }: { errors?: string[]; id?: string }) {
  return errors?.[0] ? (
    <p className="mt-2 text-sm font-medium text-red-700" id={id}>
      {errors[0]}
    </p>
  ) : null;
}

function FormSection({
  children,
  description,
  icon: Icon,
  title,
}: {
  children: React.ReactNode;
  description: string;
  icon: typeof ScanLine;
  title: string;
}) {
  return (
    <fieldset className="grid gap-5 rounded-lg border border-stone-200 bg-white p-5 sm:grid-cols-2 sm:p-7">
      <legend className="sr-only">{title}</legend>
      <div className="sm:col-span-2">
        <div className="flex items-center gap-2">
          <Icon className="size-5 text-primary" aria-hidden="true" />
          <h2 className="text-2xl font-semibold text-stone-950">{title}</h2>
        </div>
        <p className="mt-2 text-sm text-stone-600">{description}</p>
      </div>
      {children}
    </fieldset>
  );
}

type ProductFormAction = (
  previousState: SellerActionState,
  formData: FormData,
) => Promise<SellerActionState>;

function buildSubmissionData(event: FormEvent<HTMLFormElement>) {
  const submitter = (event.nativeEvent as SubmitEvent).submitter;
  return submitter instanceof HTMLButtonElement
    ? new FormData(event.currentTarget, submitter)
    : new FormData(event.currentTarget);
}

type SelectedProductImage = {
  field: string;
  file: File;
  type: ProductImageType;
};

function getSelectedProductImages(formData: FormData) {
  return requiredProductImageSlots.flatMap<SelectedProductImage>((slot) => {
    const value = formData.get(slot.field);
    return value instanceof File && value.size > 0
      ? [{ field: slot.field, file: value, type: slot.type }]
      : [];
  });
}

export function getFileFreeProductFormData(formData: FormData) {
  const result = new FormData();
  for (const [name, value] of formData.entries()) {
    if (value instanceof File) continue;
    result.append(name, value);
  }
  return result;
}

function uploadManifest(images: SelectedProductImage[]) {
  return images.map(({ field, file, type }) => ({
    field,
    mimeType: file.type,
    originalFilename: file.name,
    sizeBytes: file.size,
    type,
  }));
}

function uploadedImageReference(upload: PreparedProductUpload) {
  return {
    field: upload.field,
    imageId: upload.imageId,
    mimeType: upload.mimeType,
    originalFilename: upload.originalFilename,
    sizeBytes: upload.sizeBytes,
    storagePath: upload.storagePath,
    type: upload.type,
  };
}

function validateImages(
  formData: FormData,
  currentImageTypes: ProductImageType[],
  publishing: boolean,
) {
  const selectedTypes: ProductImageType[] = [];
  for (const slot of requiredProductImageSlots) {
    const value = formData.get(slot.field);
    if (!(value instanceof File) || value.size === 0) continue;
    const error = validateProductImage(value);
    if (error) return `${slot.label}: ${error}`;
    selectedTypes.push(slot.type);
  }

  if (!publishing) return null;

  const selectedTypeSet = new Set(selectedTypes);
  const removedTypes = new Set(
    formData
      .getAll("removeImageTypes")
      .filter((value): value is ProductImageType => typeof value === "string")
      .filter((type) => !selectedTypeSet.has(type)),
  );
  const retainedTypes = currentImageTypes.filter(
    (type) => !selectedTypeSet.has(type) && !removedTypes.has(type),
  );
  if (retainedTypes.length + selectedTypes.length < 5) {
    return "Add five genuine photos of this product before publishing.";
  }

  return null;
}

function focusFirstError(
  form: HTMLFormElement | null,
  fieldErrors: Record<string, string[] | undefined>,
) {
  if (!form) return;
  const firstField = Object.keys(fieldErrors).find((field) => fieldErrors[field]?.[0]);
  if (!firstField) return;
  const target = form.querySelector<HTMLElement>(
    `[data-error-field="${firstField}"], [name="${firstField}"]`,
  );
  target?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  target?.focus({ preventScroll: true });
}

export function ProductForm({
  actionOverride,
  allowSubmitReview = true,
  categories,
  defaults,
  draftHrefPrefix = "/seller/products",
  makes,
  pickupLocations = [],
  hiddenFields = [],
  imageDescription = "Upload five clear, seller-original images. Accepted: JPEG, PNG, or WebP, up to 8 MB each. Original uploads are preserved.",
  mode,
  published = false,
  showDraftRecoveryLink = true,
}: {
  actionOverride?: ProductFormAction;
  allowSubmitReview?: boolean;
  categories: ProductCategoryOption[];
  defaults: ProductFormDefaults;
  draftHrefPrefix?: string;
  makes: MarketplaceVehicleMakeOption[];
  pickupLocations?: PickupLocationOption[];
  hiddenFields?: Array<{ name: string; value: string }>;
  imageDescription?: string;
  mode: "create" | "edit";
  published?: boolean;
  showDraftRecoveryLink?: boolean;
}) {
  const action = actionOverride ?? (mode === "create" ? createProductAction : updateProductAction);
  const [state, setState] = useState<SellerActionState>(initialSellerActionState);
  const [pending, setPending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [clientErrors, setClientErrors] = useState<Record<string, string[] | undefined>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const selectedFilesRef = useRef(new Map<string, File>());
  const submitIntentRef = useRef<"save-draft" | "submit-review">("save-draft");
  const fieldErrors = { ...state.fieldErrors, ...clientErrors };
  const hasClientErrors = Object.values(clientErrors).some((errors) => Boolean(errors?.[0]));
  const visibleState: SellerActionState = hasClientErrors
    ? {
        fieldErrors: clientErrors,
        message: "Check the highlighted fields. Your information has not been cleared.",
        status: "error",
      }
    : state;

  useEffect(() => {
    if (state.status === "error" && state.fieldErrors) {
      focusFirstError(formRef.current, state.fieldErrors);
    }
  }, [state]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formData = buildSubmissionData(event);
    for (const [field, file] of selectedFilesRef.current) formData.set(field, file);
    if (!formData.get("intent")) formData.set("intent", submitIntentRef.current);
    const parsed = productFormSchema.safeParse(getProductFormValues(formData));
    const nextErrors: Record<string, string[] | undefined> = parsed.success
      ? {}
      : parsed.error.flatten().fieldErrors;
    const imageError = validateImages(
      formData,
      defaults.imageTypes,
      formData.get("intent") === "submit-review",
    );
    if (imageError) nextErrors.images = [imageError];

    setClientErrors(nextErrors);
    if (Object.values(nextErrors).some((errors) => Boolean(errors?.[0]))) {
      window.requestAnimationFrame(() => focusFirstError(formRef.current, nextErrors));
      return;
    }

    const requestId =
      typeof globalThis.crypto?.randomUUID === "function"
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const selectedImages = getSelectedProductImages(formData);
    const payloadSizeBytes = selectedImages.reduce((total, image) => total + image.file.size, 0);
    formData.set("requestId", requestId);
    setPending(true);
    setState(initialSellerActionState);

    try {
      const finalFormData = getFileFreeProductFormData(formData);
      if (!actionOverride && selectedImages.length > 0) {
        const preparationData = getFileFreeProductFormData(formData);
        preparationData.set("imageManifest", JSON.stringify(uploadManifest(selectedImages)));
        setUploadProgress("Preparing photo upload...");
        const preparation = await prepareProductImageUploadsAction(preparationData);
        if (preparation.status === "error" || !preparation.productId || !preparation.uploads) {
          setState(preparation);
          return;
        }

        const selectedByField = new Map(selectedImages.map((image) => [image.field, image.file]));
        const supabase = createClient();
        const uploaded: ReturnType<typeof uploadedImageReference>[] = [];
        for (const [index, upload] of preparation.uploads.entries()) {
          const file = selectedByField.get(upload.field);
          if (!file) throw new Error("UPLOAD_PLAN_MISMATCH");
          setUploadProgress(`Uploading photo ${index + 1} of ${preparation.uploads.length}...`);
          const { error } = await supabase.storage
            .from("product-media")
            .uploadToSignedUrl(upload.storagePath, upload.token, file, {
              cacheControl: "31536000",
              contentType: file.type,
              upsert: false,
            });
          if (error) throw new Error("DIRECT_UPLOAD_FAILED");
          uploaded.push(uploadedImageReference(upload));
        }
        finalFormData.set("productId", preparation.productId);
        finalFormData.set("uploadedImages", JSON.stringify(uploaded));
        setUploadProgress("Saving product changes...");
      }

      const result = await action(initialSellerActionState, finalFormData);
      setState(result);
    } catch (error) {
      const category =
        error instanceof Error && error.message === "DIRECT_UPLOAD_FAILED"
          ? "storage_upload"
          : "server_action";
      console.error("seller_product_request_failed", {
        action: mode === "create" ? "create_product" : "update_product",
        category,
        method: "POST",
        payloadSizeBytes,
        requestId,
        route: window.location.pathname,
      });
      setState({
        fieldErrors: {
          images: [
            category === "storage_upload"
              ? "A photo could not be uploaded. Check your connection and try again."
              : "The product could not be saved. Your information is still here; try again.",
          ],
        },
        message: "The product could not be saved. Your information has not been cleared.",
        status: "error",
      });
    } finally {
      setPending(false);
      setUploadProgress(null);
    }
  }

  return (
    <form
      aria-busy={pending}
      className="grid gap-7"
      noValidate
      onSubmit={handleSubmit}
      ref={formRef}
    >
      {defaults.productId ? (
        <input name="productId" type="hidden" value={defaults.productId} />
      ) : null}
      {hiddenFields.map((field) => (
        <input key={field.name} name={field.name} type="hidden" value={field.value} />
      ))}

      <FormSection
        description="Tell buyers exactly what the part is and what they will receive."
        icon={PackageCheck}
        title="Part details"
      >
        <div className="sm:col-span-2" data-error-field="name" tabIndex={-1}>
          <label className={labelClass} htmlFor="name">
            Part name <span className="text-primary">*</span>
          </label>
          <Input
            aria-describedby={fieldErrors.name?.[0] ? "name-error" : undefined}
            aria-invalid={Boolean(fieldErrors.name?.[0])}
            className={cn(fieldErrors.name?.[0] && "border-red-500 ring-1 ring-red-200")}
            defaultValue={defaults.name}
            id="name"
            name="name"
            placeholder="Toyota Camry front brake pad set"
            required
          />
          <FieldError errors={fieldErrors.name} id="name-error" />
        </div>
        <div data-error-field="categoryId" tabIndex={-1}>
          <label className={labelClass} htmlFor="categoryId">
            Category <span className="text-primary">*</span>
          </label>
          <select
            aria-describedby={fieldErrors.categoryId?.[0] ? "category-error" : undefined}
            aria-invalid={Boolean(fieldErrors.categoryId?.[0])}
            className={cn(
              selectClass,
              fieldErrors.categoryId?.[0] && "border-red-500 ring-1 ring-red-200",
            )}
            defaultValue={defaults.categoryId}
            id="categoryId"
            name="categoryId"
            required
          >
            <option disabled value="">
              Choose a category
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
          <FieldError errors={fieldErrors.categoryId} id="category-error" />
        </div>
        <div data-error-field="condition" tabIndex={-1}>
          <label className={labelClass} htmlFor="condition">
            Condition <span className="text-primary">*</span>
          </label>
          <select
            aria-invalid={Boolean(fieldErrors.condition?.[0])}
            className={cn(
              selectClass,
              fieldErrors.condition?.[0] && "border-red-500 ring-1 ring-red-200",
            )}
            defaultValue={defaults.condition}
            id="condition"
            name="condition"
            required
          >
            {productConditions.map((condition) => (
              <option key={condition.value} value={condition.value}>
                {condition.label}
              </option>
            ))}
          </select>
          <FieldError errors={fieldErrors.condition} />
        </div>
        <div>
          <label className={labelClass} htmlFor="brand">
            Brand <span className="font-normal text-stone-500">- Optional</span>
          </label>
          <Input
            defaultValue={defaults.brand}
            id="brand"
            name="brand"
            placeholder="Toyota, Bosch, Denso..."
          />
          <FieldError errors={fieldErrors.brand} />
        </div>
        <div className="sm:col-span-2" data-error-field="description" tabIndex={-1}>
          <label className={labelClass} htmlFor="description">
            Description <span className="text-primary">*</span>
          </label>
          <textarea
            aria-describedby={fieldErrors.description?.[0] ? "description-error" : undefined}
            aria-invalid={Boolean(fieldErrors.description?.[0])}
            className={cn(
              textareaClass,
              fieldErrors.description?.[0] && "border-red-500 ring-1 ring-red-200",
            )}
            defaultValue={defaults.description}
            id="description"
            name="description"
            required
            placeholder="Include material, condition details, what is in the box, and anything a buyer should know."
          />
          <FieldError errors={fieldErrors.description} id="description-error" />
        </div>
      </FormSection>

      <FormSection
        description="Add these only if they help you manage or identify this product."
        icon={ScanLine}
        title="Part numbers and stock code (optional)"
      >
        <div>
          <label className={labelClass} htmlFor="oemPartNumber">
            OEM part number <span className="font-normal text-stone-500">- Optional</span>
          </label>
          <Input
            className="font-mono"
            defaultValue={defaults.oemPartNumber}
            id="oemPartNumber"
            name="oemPartNumber"
          />
          <FieldError errors={fieldErrors.oemPartNumber} />
        </div>
        <div>
          <label className={labelClass} htmlFor="manufacturerPartNumber">
            Manufacturer part number <span className="font-normal text-stone-500">- Optional</span>
          </label>
          <Input
            className="font-mono"
            defaultValue={defaults.manufacturerPartNumber}
            id="manufacturerPartNumber"
            name="manufacturerPartNumber"
          />
          <FieldError errors={fieldErrors.manufacturerPartNumber} />
        </div>
        <div>
          <label className={labelClass} htmlFor="sku">
            Your SKU <span className="font-normal text-stone-500">- Optional</span>
          </label>
          <Input className="font-mono" defaultValue={defaults.sku} id="sku" name="sku" />
          <p className="mt-2 text-xs text-stone-500">
            We will create a stock code if you leave this blank.
          </p>
          <FieldError errors={fieldErrors.sku} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="crossReferences">
            Cross-reference numbers <span className="font-normal text-stone-500">- Optional</span>
          </label>
          <textarea
            className={textareaClass}
            defaultValue={defaults.crossReferences}
            id="crossReferences"
            name="crossReferences"
            placeholder="One per line or separated by commas"
          />
          <FieldError errors={fieldErrors.crossReferences} />
        </div>
      </FormSection>

      <FormSection
        description="Which cars does this part fit? Choose every matching vehicle you know."
        icon={CarFront}
        title="Vehicle fitment"
      >
        <div className="sm:col-span-2">
          {defaults.fitmentIds.slice(1).map((fitmentId) => (
            <input key={fitmentId} name="fitmentIds" type="hidden" value={fitmentId} />
          ))}
          <VehicleSearch
            error={fieldErrors.fitmentIds?.[0]}
            initialVehicle={defaults.fitmentIds[0]}
            inputName="fitmentIds"
            makes={makes}
            vehicles={[]}
          />
          <p className="mt-2 text-xs text-stone-500">
            Required when you publish. You can leave this blank while saving a draft.
          </p>
        </div>
      </FormSection>

      <FormSection
        description="Set the price in naira and enter how many items are available."
        icon={CircleDollarSign}
        title="Price and inventory"
      >
        <div data-error-field="priceNgn" tabIndex={-1}>
          <label className={labelClass} htmlFor="priceNgn">
            Price (NGN) <span className="text-primary">*</span>
          </label>
          <Input
            aria-describedby={fieldErrors.priceNgn?.[0] ? "price-error" : undefined}
            aria-invalid={Boolean(fieldErrors.priceNgn?.[0])}
            className={cn(fieldErrors.priceNgn?.[0] && "border-red-500 ring-1 ring-red-200")}
            defaultValue={defaults.priceNgn}
            id="priceNgn"
            inputMode="decimal"
            name="priceNgn"
            placeholder="45000.00"
            required
          />
          <FieldError errors={fieldErrors.priceNgn} id="price-error" />
        </div>
        <div data-error-field="quantity" tabIndex={-1}>
          <label className={labelClass} htmlFor="quantity">
            Quantity available <span className="text-primary">*</span>
          </label>
          <Input
            aria-describedby={fieldErrors.quantity?.[0] ? "quantity-error" : undefined}
            aria-invalid={Boolean(fieldErrors.quantity?.[0])}
            className={cn(fieldErrors.quantity?.[0] && "border-red-500 ring-1 ring-red-200")}
            defaultValue={defaults.quantity}
            id="quantity"
            inputMode="numeric"
            min={0}
            name="quantity"
            required
            type="number"
          />
          <FieldError errors={fieldErrors.quantity} id="quantity-error" />
        </div>
      </FormSection>

      <FormSection
        description="Tell buyers where the item is and whether pickup or delivery is available."
        icon={MapPin}
        title="Location and fulfilment"
      >
        <div>
          <label className={labelClass} htmlFor="country">
            Country
          </label>
          <Input defaultValue="Nigeria" id="country" name="country" readOnly />
        </div>
        <div data-error-field="state" tabIndex={-1}>
          <label className={labelClass} htmlFor="state">
            State <span className="text-primary">*</span>
          </label>
          <Input
            aria-invalid={Boolean(fieldErrors.state?.[0])}
            className={cn(fieldErrors.state?.[0] && "border-red-500 ring-1 ring-red-200")}
            defaultValue={defaults.state}
            id="state"
            name="state"
            placeholder="Lagos"
            required
          />
          <FieldError errors={fieldErrors.state} />
        </div>
        <div data-error-field="city" tabIndex={-1}>
          <label className={labelClass} htmlFor="city">
            City <span className="text-primary">*</span>
          </label>
          <Input
            aria-invalid={Boolean(fieldErrors.city?.[0])}
            className={cn(fieldErrors.city?.[0] && "border-red-500 ring-1 ring-red-200")}
            defaultValue={defaults.city}
            id="city"
            name="city"
            placeholder="Ikeja"
            required
          />
          <FieldError errors={fieldErrors.city} />
        </div>
        <div
          className="grid gap-3 sm:col-span-2"
          data-error-field="deliveryAvailable"
          tabIndex={-1}
        >
          <label className="flex items-center gap-3 text-sm text-stone-700">
            <input
              className="size-4 accent-primary"
              defaultChecked={defaults.pickupAvailable}
              name="pickupAvailable"
              type="checkbox"
            />
            Buyer pickup is available
          </label>
          <label className="flex items-center gap-3 text-sm text-stone-700">
            <input
              className="size-4 accent-primary"
              defaultChecked={defaults.deliveryAvailable}
              name="deliveryAvailable"
              type="checkbox"
            />
            Delivery is available
          </label>
          <FieldError errors={fieldErrors.deliveryAvailable} />
        </div>
      </FormSection>

      <FormSection
        description="Choose where this product leaves from and add the details used to calculate delivery. Buyers cannot see your private pickup contact."
        icon={Ruler}
        title="Delivery details"
      >
        <div className="sm:col-span-2" data-error-field="pickupLocationId" tabIndex={-1}>
          <label className={labelClass} htmlFor="pickupLocationId">Dispatch location <span className="text-primary">*</span></label>
          <select
            aria-invalid={Boolean(fieldErrors.pickupLocationId?.[0])}
            className={cn(selectClass, fieldErrors.pickupLocationId?.[0] && "border-red-500 ring-1 ring-red-200")}
            defaultValue={defaults.pickupLocationId ?? pickupLocations.find((location) => location.isDefault)?.id ?? ""}
            id="pickupLocationId"
            name="pickupLocationId"
          >
            <option value="">Choose a pickup location</option>
            {pickupLocations.map((location) => <option key={location.id} value={location.id}>{location.label} - {location.town}, {location.lga}</option>)}
          </select>
          {!pickupLocations.length ? <p className="mt-2 text-sm font-semibold text-red-700">Add a pickup location in Store Settings before publishing.</p> : null}
          <FieldError errors={fieldErrors.pickupLocationId} />
        </div>
        <div data-error-field="weightKg" tabIndex={-1}>
          <label className={labelClass} htmlFor="weightKg">Product weight (kg) <span className="font-normal text-stone-500">- Required for delivery</span></label>
          <Input aria-invalid={Boolean(fieldErrors.weightKg?.[0])} defaultValue={defaults.weightKg ?? ""} id="weightKg" inputMode="decimal" min="0.001" name="weightKg" step="0.001" type="number" />
          <FieldError errors={fieldErrors.weightKg} />
        </div>
        <div>
          <label className={labelClass} htmlFor="packagingWeightGrams">Packaging weight (grams) <span className="font-normal text-stone-500">- Optional</span></label>
          <Input defaultValue={defaults.packagingWeightGrams ?? 0} id="packagingWeightGrams" inputMode="numeric" min="0" name="packagingWeightGrams" type="number" />
        </div>
        <div data-error-field="lengthCm" tabIndex={-1}>
          <label className={labelClass} htmlFor="lengthCm">Length (cm) <span className="font-normal text-stone-500">- Optional</span></label>
          <Input defaultValue={defaults.lengthCm ?? ""} id="lengthCm" inputMode="decimal" min="0.1" name="lengthCm" step="0.1" type="number" />
          <FieldError errors={fieldErrors.lengthCm} />
        </div>
        <div>
          <label className={labelClass} htmlFor="widthCm">Width (cm) <span className="font-normal text-stone-500">- Optional</span></label>
          <Input defaultValue={defaults.widthCm ?? ""} id="widthCm" inputMode="decimal" min="0.1" name="widthCm" step="0.1" type="number" />
        </div>
        <div>
          <label className={labelClass} htmlFor="heightCm">Height (cm) <span className="font-normal text-stone-500">- Optional</span></label>
          <Input defaultValue={defaults.heightCm ?? ""} id="heightCm" inputMode="decimal" min="0.1" name="heightCm" step="0.1" type="number" />
        </div>
        <div className="grid content-start gap-3 pt-1">
          <label className="flex items-center gap-3 text-sm text-stone-700"><input className="size-4 accent-primary" defaultChecked={defaults.isFragile ?? false} name="isFragile" type="checkbox" />Fragile item</label>
          <label className="flex items-center gap-3 text-sm text-stone-700"><input className="size-4 accent-primary" defaultChecked={defaults.isBulky ?? false} name="isBulky" type="checkbox" />Bulky item</label>
          <p className="text-xs leading-5 text-stone-500">Length, width, and height are required when bulky is selected.</p>
        </div>
      </FormSection>

      <div data-error-field="images" tabIndex={-1}>
        <FormSection description={imageDescription} icon={Camera} title="Product images">
          {requiredProductImageSlots.map((slot) => {
            const current = defaults.imageTypes.includes(slot.type);
            return (
              <div
                className={cn(
                  "rounded-md border bg-[#fffdf9] p-4",
                  fieldErrors.images?.[0] ? "border-red-300" : "border-stone-200",
                )}
                key={slot.type}
              >
                <label className={labelClass} htmlFor={slot.field}>
                  {slot.label}
                </label>
                <p className="mb-3 text-xs leading-5 text-stone-500">{slot.description}</p>
                {current ? (
                  <div className="mb-3 grid gap-2">
                    <p className="text-xs font-semibold text-emerald-700">
                      Current image saved. Choose a file only to add a replacement.
                    </p>
                    <label className="flex items-center gap-2 text-xs text-stone-600">
                      <input
                        className="size-4 accent-primary"
                        name="removeImageTypes"
                        type="checkbox"
                        value={slot.type}
                      />
                      Remove this image without replacing it
                    </label>
                  </div>
                ) : null}
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="block w-full text-sm text-stone-700 file:mr-3 file:rounded-md file:border-0 file:bg-stone-950 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                  id={slot.field}
                  name={slot.field}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) selectedFilesRef.current.set(slot.field, file);
                    else selectedFilesRef.current.delete(slot.field);
                  }}
                  type="file"
                />
              </div>
            );
          })}
          <input name="actualItemType" type="hidden" value={defaults.actualItemType ?? ""} />
          <p className="sm:col-span-2 text-xs leading-5 text-stone-500">
            For used, refurbished, reconditioned, or OEM take-off products, the main photo must show
            the actual item being sold.
          </p>
          <div className="sm:col-span-2">
            <FieldError errors={fieldErrors.images} id="images-error" />
          </div>
        </FormSection>
      </div>

      {uploadProgress ? (
        <p
          className="rounded-md border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-800"
          role="status"
        >
          {uploadProgress}
        </p>
      ) : null}
      <SellerFormAlert state={visibleState} />
      {state.productId && showDraftRecoveryLink ? (
        <p className="text-sm text-stone-600">
          The draft was created. You can continue from product{" "}
          <a
            className="font-semibold text-primary underline"
            href={`${draftHrefPrefix}/${state.productId}`}
          >
            {state.productId.slice(0, 8)}
          </a>
          .
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-3 border-t border-stone-200 pt-6 sm:flex-row sm:justify-end">
        {published ? (
          <SellerSubmitButton
            name="intent"
            onClick={() => {
              submitIntentRef.current = "submit-review";
            }}
            pending={pending}
            pendingLabel="Saving changes..."
            type="submit"
            value="submit-review"
          >
            Save changes
          </SellerSubmitButton>
        ) : (
          <>
            <SellerSubmitButton
              name="intent"
              onClick={() => {
                submitIntentRef.current = "save-draft";
              }}
              pending={pending}
              pendingLabel="Saving draft..."
              type="submit"
              value="save-draft"
              variant="outline"
            >
              Save draft
            </SellerSubmitButton>
            {allowSubmitReview ? (
              <SellerSubmitButton
                name="intent"
                onClick={() => {
                  submitIntentRef.current = "submit-review";
                }}
                pending={pending}
                pendingLabel="Publishing..."
                type="submit"
                value="submit-review"
              >
                Publish product
              </SellerSubmitButton>
            ) : null}
          </>
        )}
      </div>
    </form>
  );
}
