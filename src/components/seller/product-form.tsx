"use client";

import { useActionState } from "react";
import { Camera, CarFront, CircleDollarSign, MapPin, PackageCheck, ScanLine } from "lucide-react";

import {
  createProductAction,
  updateProductAction,
} from "@/app/(protected)/seller/actions";
import { SellerFormAlert } from "@/components/seller/seller-form-alert";
import {
  initialSellerActionState,
  type SellerActionState,
} from "@/lib/marketplace/seller-action-state";
import { SellerSubmitButton } from "@/components/seller/seller-submit-button";
import { Input } from "@/components/ui/input";
import {
  productConditions,
  requiredProductImageSlots,
} from "@/lib/marketplace/products";
import type {
  ProductCategoryOption,
  VehicleFitmentOption,
} from "@/lib/marketplace/seller-data";
import type { ProductCondition, ProductImageType } from "@/lib/supabase/database.types";

export type ProductFormDefaults = {
  actualItemType?: ProductImageType;
  brand: string;
  categoryId: string;
  city: string;
  condition: ProductCondition;
  crossReferences: string;
  deliveryAvailable: boolean;
  description: string;
  fitmentIds: string[];
  imageTypes: ProductImageType[];
  manufacturerPartNumber: string;
  name: string;
  oemPartNumber: string;
  pickupAvailable: boolean;
  priceNgn: string;
  productId?: string;
  quantity: number;
  sku: string;
  state: string;
};

const labelClass = "mb-2 block text-sm font-semibold text-stone-800";
const selectClass = "flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring";
const textareaClass = "min-h-32 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none transition-colors placeholder:text-stone-400 focus-visible:ring-2 focus-visible:ring-ring";

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.[0] ? <p className="mt-2 text-sm text-primary">{errors[0]}</p> : null;
}

function FormSection({ children, description, icon: Icon, title }: { children: React.ReactNode; description: string; icon: typeof ScanLine; title: string }) {
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

export function ProductForm({
  actionOverride,
  allowSubmitReview = true,
  categories,
  defaults,
  draftHrefPrefix = "/seller/products",
  fitments,
  hiddenFields = [],
  imageDescription = "Upload five clear, seller-original images. Accepted: JPEG, PNG, or WebP, up to 8 MB each. Original uploads are preserved.",
  mode,
  showDraftRecoveryLink = true,
}: {
  actionOverride?: ProductFormAction;
  allowSubmitReview?: boolean;
  categories: ProductCategoryOption[];
  defaults: ProductFormDefaults;
  draftHrefPrefix?: string;
  fitments: VehicleFitmentOption[];
  hiddenFields?: Array<{ name: string; value: string }>;
  imageDescription?: string;
  mode: "create" | "edit";
  showDraftRecoveryLink?: boolean;
}) {
  const action = actionOverride ?? (mode === "create" ? createProductAction : updateProductAction);
  const [state, formAction] = useActionState(action, initialSellerActionState);

  return (
    <form action={formAction} className="grid gap-7" noValidate>
      {defaults.productId ? <input name="productId" type="hidden" value={defaults.productId} /> : null}
      {hiddenFields.map((field) => <input key={field.name} name={field.name} type="hidden" value={field.value} />)}

      <FormSection description="Use a specific, buyer-friendly title and describe exactly what is being sold." icon={PackageCheck} title="Part details">
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="name">Part name</label>
          <Input defaultValue={defaults.name} id="name" name="name" placeholder="Toyota Camry front brake pad set" />
          <FieldError errors={state.fieldErrors?.name} />
        </div>
        <div>
          <label className={labelClass} htmlFor="categoryId">Category</label>
          <select className={selectClass} defaultValue={defaults.categoryId} id="categoryId" name="categoryId">
            <option disabled value="">Choose a category</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
          </select>
          <FieldError errors={state.fieldErrors?.categoryId} />
        </div>
        <div>
          <label className={labelClass} htmlFor="condition">Condition</label>
          <select className={selectClass} defaultValue={defaults.condition} id="condition" name="condition">
            {productConditions.map((condition) => <option key={condition.value} value={condition.value}>{condition.label}</option>)}
          </select>
          <FieldError errors={state.fieldErrors?.condition} />
        </div>
        <div>
          <label className={labelClass} htmlFor="brand">Brand</label>
          <Input defaultValue={defaults.brand} id="brand" name="brand" placeholder="Toyota, Bosch, Denso…" />
          <FieldError errors={state.fieldErrors?.brand} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="description">Description</label>
          <textarea className={textareaClass} defaultValue={defaults.description} id="description" name="description" placeholder="Include material, condition details, what is in the box, and anything a buyer should know." />
          <FieldError errors={state.fieldErrors?.description} />
        </div>
      </FormSection>

      <FormSection description="Part numbers improve exact-match search and reduce fitment mistakes." icon={ScanLine} title="Identification">
        <div>
          <label className={labelClass} htmlFor="oemPartNumber">OEM part number <span className="font-normal text-stone-500">(optional)</span></label>
          <Input className="font-mono" defaultValue={defaults.oemPartNumber} id="oemPartNumber" name="oemPartNumber" />
        </div>
        <div>
          <label className={labelClass} htmlFor="manufacturerPartNumber">Manufacturer part number <span className="font-normal text-stone-500">(optional)</span></label>
          <Input className="font-mono" defaultValue={defaults.manufacturerPartNumber} id="manufacturerPartNumber" name="manufacturerPartNumber" />
        </div>
        <div>
          <label className={labelClass} htmlFor="sku">Your SKU</label>
          <Input className="font-mono" defaultValue={defaults.sku} id="sku" name="sku" />
          <FieldError errors={state.fieldErrors?.sku} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="crossReferences">Cross-reference numbers <span className="font-normal text-stone-500">(optional)</span></label>
          <textarea className={textareaClass} defaultValue={defaults.crossReferences} id="crossReferences" name="crossReferences" placeholder="One per line or separated by commas" />
          <FieldError errors={state.fieldErrors?.crossReferences} />
        </div>
      </FormSection>

      <FormSection description="Select every seeded vehicle configuration this exact part fits. Compatibility can be expanded as the vehicle catalogue grows." icon={CarFront} title="Vehicle fitment">
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="fitmentIds">Compatible vehicles <span className="font-normal text-stone-500">(optional for draft)</span></label>
          <select className="min-h-44 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" defaultValue={defaults.fitmentIds} id="fitmentIds" multiple name="fitmentIds">
            {fitments.map((fitment) => <option key={fitment.id} value={fitment.id}>{fitment.label}</option>)}
          </select>
          <p className="mt-2 text-xs text-stone-500">Hold Ctrl on Windows or Command on macOS to select more than one.</p>
          <FieldError errors={state.fieldErrors?.fitmentIds} />
        </div>
      </FormSection>

      <FormSection description="Prices are stored in Nigerian naira with exact kobo precision. Inventory changes are recorded in history." icon={CircleDollarSign} title="Price and inventory">
        <div>
          <label className={labelClass} htmlFor="priceNgn">Price (NGN)</label>
          <Input defaultValue={defaults.priceNgn} id="priceNgn" inputMode="decimal" name="priceNgn" placeholder="45000.00" />
          <FieldError errors={state.fieldErrors?.priceNgn} />
        </div>
        <div>
          <label className={labelClass} htmlFor="quantity">Quantity available</label>
          <Input defaultValue={defaults.quantity} id="quantity" inputMode="numeric" min={0} name="quantity" type="number" />
          <FieldError errors={state.fieldErrors?.quantity} />
        </div>
      </FormSection>

      <FormSection description="Tell buyers where the item is and how you can fulfil it." icon={MapPin} title="Location and fulfilment">
        <div>
          <label className={labelClass} htmlFor="country">Country</label>
          <Input defaultValue="Nigeria" id="country" name="country" readOnly />
        </div>
        <div>
          <label className={labelClass} htmlFor="state">State</label>
          <Input defaultValue={defaults.state} id="state" name="state" placeholder="Lagos" />
          <FieldError errors={state.fieldErrors?.state} />
        </div>
        <div>
          <label className={labelClass} htmlFor="city">City</label>
          <Input defaultValue={defaults.city} id="city" name="city" placeholder="Ikeja" />
          <FieldError errors={state.fieldErrors?.city} />
        </div>
        <div className="grid gap-3 sm:col-span-2">
          <label className="flex items-center gap-3 text-sm text-stone-700">
            <input className="size-4 accent-primary" defaultChecked={defaults.pickupAvailable} name="pickupAvailable" type="checkbox" />
            Buyer pickup is available
          </label>
          <label className="flex items-center gap-3 text-sm text-stone-700">
            <input className="size-4 accent-primary" defaultChecked={defaults.deliveryAvailable} name="deliveryAvailable" type="checkbox" />
            Delivery is available
          </label>
          <FieldError errors={state.fieldErrors?.deliveryAvailable} />
        </div>
      </FormSection>

      <FormSection description={imageDescription} icon={Camera} title="Product images">
        {requiredProductImageSlots.map((slot) => {
          const current = defaults.imageTypes.includes(slot.type);
          return (
            <div className="rounded-md border border-stone-200 bg-[#fffdf9] p-4" key={slot.type}>
              <label className={labelClass} htmlFor={slot.field}>{slot.label}</label>
              <p className="mb-3 text-xs leading-5 text-stone-500">{slot.description}</p>
              {current ? <p className="mb-3 text-xs font-semibold text-emerald-700">Current image saved. Choose a file only to add a replacement.</p> : null}
              <input accept="image/jpeg,image/png,image/webp" className="block w-full text-sm text-stone-700 file:mr-3 file:rounded-md file:border-0 file:bg-stone-950 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white" id={slot.field} name={slot.field} type="file" />
            </div>
          );
        })}
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="actualItemType">Actual physical item shown <span className="font-normal text-stone-500">(required for used, refurbished, reconditioned, and OEM take-off parts)</span></label>
          <select className={selectClass} defaultValue={defaults.actualItemType ?? ""} id="actualItemType" name="actualItemType">
            <option value="">Not applicable / choose an image</option>
            {requiredProductImageSlots.map((slot) => <option key={slot.type} value={slot.type}>{slot.label}</option>)}
          </select>
        </div>
      </FormSection>

      <SellerFormAlert state={state} />
      {state.productId && showDraftRecoveryLink ? <p className="text-sm text-stone-600">The draft was created. You can continue from product <a className="font-semibold text-primary underline" href={`${draftHrefPrefix}/${state.productId}`}>{state.productId.slice(0, 8)}</a>.</p> : null}
      <div className="flex flex-col-reverse gap-3 border-t border-stone-200 pt-6 sm:flex-row sm:justify-end">
        <SellerSubmitButton name="intent" pendingLabel="Saving draft…" type="submit" value="save-draft" variant="outline">Save draft</SellerSubmitButton>
        {allowSubmitReview ? <SellerSubmitButton name="intent" pendingLabel="Submitting for review…" type="submit" value="submit-review">Submit for review</SellerSubmitButton> : null}
      </div>
    </form>
  );
}
