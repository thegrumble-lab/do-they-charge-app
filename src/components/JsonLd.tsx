/**
 * Renders a JSON-LD payload as a native <script> tag.
 *
 * The `<` → `<` replacement is not decoration: restaurant names come
 * from the FSA feed and report notes are typed by the public, so both can
 * contain anything at all. Without it, a name or note containing "</script>"
 * would break out of the tag — a textbook XSS hole. Next's own JSON-LD
 * guidance calls this out; see node_modules/next/dist/docs/01-app/02-guides/json-ld.md.
 *
 * A native <script> is correct here rather than next/script: this is
 * structured data, not executable code, so it should never be deferred or
 * moved.
 */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
