type JsonLdObject = Record<string, unknown>;

export function JsonLd({
  data,
}: {
  data: JsonLdObject | readonly JsonLdObject[];
}) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replaceAll("<", "\\u003c"),
      }}
      type="application/ld+json"
    />
  );
}
