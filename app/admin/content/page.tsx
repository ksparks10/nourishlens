import { requirePermission } from "@/lib/auth/authorization";
import { saveContent } from "./actions";
export default async function Content({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const q = await searchParams;
  const { supabase } = await requirePermission("content.manage");
  const { data } = await supabase
    .from("content_blocks")
    .select("id,key,title,body,is_published")
    .order("key");
  return (
    <>
      <p className="eyebrow">PUBLIC CONTENT</p>
      <h1>Content blocks</h1>
      {q.error && <p className="error">{q.error}</p>}
      {q.message && <p>{q.message}</p>}
      {data?.map((block) => (
        <form className="card form" action={saveContent} key={block.id}>
          <input type="hidden" name="id" value={block.id} />
          <strong>{block.key}</strong>
          <label>
            Title
            <input name="title" defaultValue={block.title} />
          </label>
          <label>
            Body
            <textarea name="body" defaultValue={block.body} />
          </label>
          <label>
            <input
              name="published"
              type="checkbox"
              defaultChecked={block.is_published}
            />{" "}
            Published
          </label>
          <button>Save</button>
        </form>
      ))}
    </>
  );
}
