import { requirePermission } from "@/lib/auth/authorization";
import { resolveReport, reviewSubmission } from "./actions";
type Submission = {
  id: string;
  food_id: string;
  status: string;
  created_at: string;
  foods: { name: string; brand: string | null };
};
type Report = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  foods: { name: string; brand: string | null };
};
export default async function FoodsAdmin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const q = await searchParams;
  const { supabase } = await requirePermission("food.manage");
  const [{ data: submissionData }, { data: reportData }] = await Promise.all([
    supabase
      .from("custom_food_submissions")
      .select("id,food_id,status,created_at,foods(name,brand)")
      .eq("status", "pending"),
    supabase
      .from("food_reports")
      .select("id,reason,details,status,created_at,foods(name,brand)")
      .in("status", ["open", "reviewing"]),
  ]);
  const submissions = (submissionData ?? []) as unknown as Submission[],
    reports = (reportData ?? []) as unknown as Report[];
  return (
    <>
      <p className="eyebrow">CATALOG MODERATION</p>
      <h1>Foods</h1>
      {q.error && <p className="error">{q.error}</p>}
      {q.message && <p role="status">{q.message}</p>}
      <section>
        <h2>Custom food submissions</h2>
        {submissions.map((item) => (
          <div className="card" key={item.id}>
            <strong>{item.foods.name}</strong>
            <form className="form" action={reviewSubmission}>
              <input type="hidden" name="submission_id" value={item.id} />
              <input type="hidden" name="food_id" value={item.food_id} />
              <select name="decision">
                <option value="approved">Approve public catalog record</option>
                <option value="rejected">Reject</option>
              </select>
              <input
                name="reason"
                placeholder="Required reason"
                minLength={10}
                required
              />
              <button>Review</button>
            </form>
          </div>
        ))}
      </section>
      <section>
        <h2>Food reports</h2>
        {reports.map((item) => (
          <div className="card" key={item.id}>
            <strong>{item.foods.name}</strong>
            <p>
              {item.reason}: {item.details}
            </p>
            <form className="form" action={resolveReport}>
              <input type="hidden" name="report_id" value={item.id} />
              <select name="status">
                <option value="resolved">Resolve</option>
                <option value="rejected">Reject report</option>
              </select>
              <input
                name="reason"
                placeholder="Resolution notes"
                minLength={10}
                required
              />
              <button>Close report</button>
            </form>
          </div>
        ))}
      </section>
    </>
  );
}
