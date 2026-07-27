import { setProjectionDisplay } from "@/app/app/projections/actions";
export function ProjectionToggle({
  mode,
  returnTo = "/app/projections",
}: {
  mode: string;
  returnTo?: string;
}) {
  return (
    <form className="toggle-form" action={setProjectionDisplay}>
      <input type="hidden" name="return_to" value={returnTo} />
      <label>
        <input
          type="radio"
          name="mode"
          value="eligible"
          defaultChecked={mode !== "confirmed_only"}
        />{" "}
        Include eligible projections
      </label>
      <label>
        <input
          type="radio"
          name="mode"
          value="confirmed_only"
          defaultChecked={mode === "confirmed_only"}
        />{" "}
        Confirmed and calculated only
      </label>
      <button>Save view</button>
    </form>
  );
}
