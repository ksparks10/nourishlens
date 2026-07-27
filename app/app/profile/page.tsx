import Link from "next/link";
import { requireUser } from "@/lib/auth/authorization";
import { localDateInputValue } from "@/lib/date/local-date";
import { centimetersToFeetInches, kilogramsToPounds } from "@/lib/measurements";
import { saveWeight } from "@/app/app/weight/actions";
import { resetTarget, savePersonalTarget } from "@/app/app/targets/actions";
import { updateNutritionProfile, updateProfile } from "./actions";

type TargetRow = {
  id: string;
  target_amount: number | null;
  minimum_amount: number | null;
  maximum_amount: number | null;
  target_type: string;
  is_overridden: boolean;
  nutrients: { name: string };
  nutrient_units: { symbol: string };
  target_methodologies: { name: string; source_name: string };
};

export default async function Profile({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const query = await searchParams;
  const { supabase, user } = await requireUser();
  const [accountResult, nutritionResult, weightsResult, targetsResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name,timezone")
        .eq("id", user.id)
        .single(),
      supabase
        .from("nutrition_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("weight_logs")
        .select("id,logged_date,weight_kg,notes")
        .order("logged_date", { ascending: false })
        .limit(90),
      supabase
        .from("user_nutrient_targets")
        .select(
          "id,target_amount,minimum_amount,maximum_amount,target_type,is_overridden,nutrients(name),nutrient_units(symbol),target_methodologies(name,source_name)",
        )
        .order("effective_at"),
    ]);
  const account = accountResult.data;
  const nutrition = nutritionResult.data;
  const weights = weightsResult.data ?? [];
  const targets = (targetsResult.data ?? []) as unknown as TargetRow[];
  const orderedWeights = [...weights].reverse();
  const minWeight = orderedWeights.length
    ? Math.min(...orderedWeights.map((row) => Number(row.weight_kg)))
    : 0;
  const maxWeight = orderedWeights.length
    ? Math.max(...orderedWeights.map((row) => Number(row.weight_kg)))
    : 0;
  const usesUs = nutrition?.measurement_system === "us";
  const displayWeight = (kilograms: number) =>
    usesUs ? kilogramsToPounds(kilograms) : Number(kilograms);
  const weightUnit = usesUs ? "lb" : "kg";
  const usHeight = nutrition
    ? centimetersToFeetInches(Number(nutrition.height_cm))
    : null;

  return (
    <>
      <p className="eyebrow">YOUR SETTINGS</p>
      <h1>Profile</h1>
      <p className="muted">
        Manage the personal details, measurements, goals, and nutrition targets
        used throughout Nourish Lens.
      </p>
      {query.error && <p className="error">{query.error}</p>}
      {query.message && <p role="status">{query.message}</p>}

      <section className="card profile-section" id="account-profile">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ACCOUNT PROFILE</p>
            <h2>Personal details</h2>
          </div>
        </div>
        <form className="form" action={updateProfile}>
          <label>
            Display name
            <input
              name="display_name"
              defaultValue={account?.display_name ?? ""}
            />
          </label>
          <label>
            Time zone
            <input
              name="timezone"
              defaultValue={account?.timezone ?? "America/Los_Angeles"}
              required
            />
          </label>
          <button className="button">Save personal details</button>
        </form>
      </section>

      <section className="card profile-section" id="nutrition-profile">
        <div className="section-heading">
          <div>
            <p className="eyebrow">NUTRITION PROFILE</p>
            <h2>Body, activity, and goals</h2>
          </div>
          <span>Changes recalculate recognized targets</span>
        </div>
        {nutrition ? (
          <form className="form" action={updateNutritionProfile}>
            <input
              type="hidden"
              name="displayed_measurement_system"
              value={nutrition.measurement_system}
            />
            <div className="form-grid">
              <label>
                Date of birth
                <input
                  name="birth_date"
                  type="date"
                  defaultValue={nutrition.birth_date}
                  required
                />
              </label>
              {usesUs ? (
                <fieldset className="height-fields">
                  <legend>Height</legend>
                  <label>
                    Feet
                    <input
                      name="height_feet"
                      type="number"
                      min="1"
                      max="9"
                      step="1"
                      defaultValue={usHeight?.feet}
                      required
                    />
                  </label>
                  <label>
                    Inches
                    <input
                      name="height_inches"
                      type="number"
                      min="0"
                      max="11.9"
                      step="0.1"
                      defaultValue={usHeight?.inches}
                      required
                    />
                  </label>
                </fieldset>
              ) : (
                <label>
                  Height (cm)
                  <input
                    name="height_value"
                    type="number"
                    min="80"
                    max="260"
                    step="0.1"
                    defaultValue={nutrition.height_cm}
                    required
                  />
                </label>
              )}
              <label>
                Current weight ({weightUnit})
                <input
                  name="weight_value"
                  type="number"
                  min={usesUs ? 55 : 25}
                  max={usesUs ? 1102 : 500}
                  step="0.1"
                  defaultValue={displayWeight(Number(nutrition.weight_kg))}
                  required
                />
              </label>
              <label>
                Target weight ({weightUnit}, optional)
                <input
                  name="target_weight_value"
                  type="number"
                  min={usesUs ? 55 : 25}
                  max={usesUs ? 1102 : 500}
                  step="0.1"
                  defaultValue={
                    nutrition.target_weight_kg === null
                      ? ""
                      : displayWeight(Number(nutrition.target_weight_kg))
                  }
                />
              </label>
              <label>
                Measurement system
                <select
                  name="measurement_system"
                  defaultValue={nutrition.measurement_system}
                >
                  <option value="metric">Metric</option>
                  <option value="us">US customary</option>
                </select>
              </label>
              <label>
                Biological sex used for applicable references
                <select
                  name="biological_sex"
                  defaultValue={nutrition.biological_sex}
                >
                  <option value="unspecified">Prefer not to specify</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </label>
              <label>
                Activity level
                <select
                  name="activity_level"
                  defaultValue={nutrition.activity_level}
                >
                  <option value="sedentary">Sedentary</option>
                  <option value="light">Lightly active</option>
                  <option value="moderate">Moderately active</option>
                  <option value="very_active">Very active</option>
                  <option value="extra_active">Extra active</option>
                </select>
              </label>
              <label>
                Primary goal
                <select
                  name="primary_goal"
                  defaultValue={nutrition.primary_goal}
                >
                  <option value="maintain">Maintain weight</option>
                  <option value="lose">Lose weight</option>
                  <option value="gain">Gain weight</option>
                  <option value="build_muscle">Build muscle</option>
                  <option value="diet_quality">Improve diet quality</option>
                  <option value="micronutrients">Track micronutrients</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
              <label>
                Dietary pattern
                <select
                  name="dietary_pattern"
                  defaultValue={nutrition.dietary_pattern}
                >
                  <option value="no_preference">No preference</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="pescatarian">Pescatarian</option>
                  <option value="mediterranean">Mediterranean</option>
                  <option value="gluten_free">Gluten-free</option>
                </select>
              </label>
              <label>
                Calorie target override (optional)
                <input
                  name="custom_calorie_target"
                  type="number"
                  min="1000"
                  max="10000"
                  defaultValue={nutrition.custom_calorie_target ?? ""}
                />
              </label>
              <label>
                Protein target override, g (optional)
                <input
                  name="custom_protein_target"
                  type="number"
                  min="10"
                  max="1000"
                  defaultValue={nutrition.custom_protein_target ?? ""}
                />
              </label>
            </div>
            <button className="button">Save and recalculate targets</button>
          </form>
        ) : (
          <Link className="button" href="/app/onboarding">
            Build nutrition profile
          </Link>
        )}
      </section>

      <section className="card profile-section" id="measurements">
        <div className="section-heading">
          <div>
            <p className="eyebrow">MEASUREMENTS</p>
            <h2>Weight history</h2>
          </div>
          <span>New entries update weight-based targets</span>
        </div>
        <form className="form-grid" action={saveWeight}>
          <input
            type="hidden"
            name="measurement_system"
            value={nutrition?.measurement_system ?? "metric"}
          />
          <label>
            Date
            <input
              name="logged_date"
              type="date"
              defaultValue={localDateInputValue()}
            />
          </label>
          <label>
            Weight ({weightUnit})
            <input
              name="weight_value"
              type="number"
              min={usesUs ? 55 : 25}
              max={usesUs ? 1102 : 500}
              step=".1"
              defaultValue={
                nutrition ? displayWeight(Number(nutrition.weight_kg)) : ""
              }
              required
            />
          </label>
          <label>
            Notes
            <input name="notes" />
          </label>
          <button>Save weight</button>
        </form>
        {orderedWeights.length > 0 && (
          <>
            <div className="weight-chart" aria-label="Weight trend chart">
              {orderedWeights.map((row) => (
                <div
                  key={row.id}
                  className="weight-bar"
                  title={`${row.logged_date}: ${displayWeight(Number(row.weight_kg))} ${weightUnit}`}
                  style={{
                    height: `${30 + ((Number(row.weight_kg) - minWeight) / Math.max(maxWeight - minWeight, 1)) * 120}px`,
                  }}
                >
                  <span>{displayWeight(Number(row.weight_kg))}</span>
                </div>
              ))}
            </div>
            <ul className="measurement-history">
              {weights.map((row) => (
                <li key={row.id}>
                  {row.logged_date}: {displayWeight(Number(row.weight_kg))}{" "}
                  {weightUnit} {row.notes && `· ${row.notes}`}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="profile-section" id="targets">
        <div className="section-heading">
          <div>
            <p className="eyebrow">NUTRITION TARGETS</p>
            <h2>Recommended and personal goals</h2>
          </div>
          <span>{targets.length} tracked targets</span>
        </div>
        <p className="muted">
          Recognized references update with the nutrition profile. Personal
          overrides remain unchanged.
        </p>
        <div className="progress-list profile-target-list">
          {targets.map((target) => (
            <section className="card" key={target.id}>
              <strong>{target.nutrients.name}</strong>
              <p>
                {target.target_type === "minimum" &&
                  `Reach at least ${target.minimum_amount} ${target.nutrient_units.symbol}`}
                {target.target_type === "maximum" &&
                  `Stay below ${target.maximum_amount} ${target.nutrient_units.symbol}`}
                {target.target_type === "range" &&
                  `${target.minimum_amount}–${target.maximum_amount} ${target.nutrient_units.symbol}`}
                {["informational", "none"].includes(target.target_type) &&
                  "No established daily recommendation"}
              </p>
              <small>
                {target.target_methodologies.name} ·{" "}
                {target.target_methodologies.source_name}
                {target.is_overridden ? " · Personal override" : ""}
              </small>
              <details>
                <summary>Adjust goal</summary>
                <form className="inline-form" action={savePersonalTarget}>
                  <input type="hidden" name="target_id" value={target.id} />
                  <select name="direction" aria-label="Goal direction">
                    <option value="minimum">Reach at least</option>
                    <option value="maximum">Stay below</option>
                  </select>
                  <input
                    aria-label={`Personal goal for ${target.nutrients.name}`}
                    name="amount"
                    type="number"
                    min="0.000001"
                    max="10000000"
                    step="any"
                    defaultValue={target.target_amount ?? undefined}
                    placeholder={`Amount in ${target.nutrient_units.symbol}`}
                    required
                  />
                  <button>Save personal goal</button>
                </form>
                {target.is_overridden && (
                  <form action={resetTarget}>
                    <input type="hidden" name="target_id" value={target.id} />
                    <button>Restore recognized default</button>
                  </form>
                )}
              </details>
            </section>
          ))}
        </div>
      </section>
    </>
  );
}
