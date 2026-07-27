import { completeOnboarding } from "./actions";
export default async function Onboarding({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const q = await searchParams;
  return (
    <>
      <p className="eyebrow">PERSONALIZATION</p>
      <h1>Build your nutrition baseline</h1>
      <p className="muted">
        We use these values to estimate planning targets. They are private,
        editable, and are not used to diagnose or treat any condition.
      </p>
      {q.error && (
        <p className="error" role="alert">
          {q.error}
        </p>
      )}
      <form className="card form" action={completeOnboarding}>
        <label>
          Date of birth
          <input name="birth_date" type="date" required />
        </label>
        <div className="form-grid">
          <fieldset className="height-fields">
            <legend>Height</legend>
            <label>
              Feet
              <input
                name="height_feet"
                type="number"
                min="2"
                max="8"
                step="1"
                placeholder="6"
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
                placeholder="2"
                required
              />
            </label>
          </fieldset>
          <label>
            Weight (lb)
            <input
              name="weight_lb"
              type="number"
              min="55"
              max="1102"
              step="0.1"
              placeholder="200"
              required
            />
          </label>
        </div>
        <label>
          Biological sex used for applicable equations
          <select name="biological_sex">
            <option value="unspecified">Prefer not to specify</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </label>
        <label>
          Activity level
          <select name="activity_level">
            <option value="sedentary">Sedentary</option>
            <option value="light">Lightly active</option>
            <option value="moderate">Moderately active</option>
            <option value="very_active">Very active</option>
            <option value="extra_active">Extra active</option>
          </select>
        </label>
        <label>
          Primary goal
          <select name="primary_goal">
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
          Dietary pattern (optional)
          <select name="dietary_pattern">
            <option value="no_preference">No preference</option>
            <option value="vegetarian">Vegetarian</option>
            <option value="vegan">Vegan</option>
            <option value="pescatarian">Pescatarian</option>
            <option value="mediterranean">Mediterranean</option>
            <option value="gluten_free">Gluten-free</option>
          </select>
        </label>
        <div className="form-grid">
          <label>
            Custom calorie target (optional)
            <input
              name="custom_calorie_target"
              type="number"
              min="1000"
              max="10000"
            />
          </label>
          <label>
            Custom protein target, g (optional)
            <input
              name="custom_protein_target"
              type="number"
              min="10"
              max="1000"
            />
          </label>
        </div>
        <button className="button">Save and calculate targets</button>
      </form>
    </>
  );
}
