import Link from "next/link";
import { requireUser } from "@/lib/auth/authorization";
import {
  getDailyNutrition,
  targetPercent,
  targetStatus,
  type DailyTarget,
  type DailyTotal,
} from "@/lib/nutrition/daily";
import { validDiaryDate } from "@/lib/validation/diary";
import { DateSelector } from "@/components/date-selector";
import { getGapFoodRecommendations } from "@/lib/nutrition/recommendations";
import { targetAlignmentPercent } from "@/lib/nutrition/progress";
import { FoodRecommendations } from "@/components/food-recommendations";
import { Gauge } from "lucide-react";

const groups = [
  { key: "energy_macros", title: "Energy and macronutrients" },
  { key: "vitamins", title: "Vitamins" },
  { key: "minerals", title: "Minerals" },
  { key: "fatty_acids", title: "Essential fatty acids" },
  { key: "sugars", title: "Sugars" },
  { key: "amino_acids", title: "Amino acids" },
  { key: "trace_elements", title: "Trace elements" },
  { key: "bioactive_compounds", title: "Other food components" },
  { key: "polyphenols", title: "Polyphenols and flavonoids" },
] as const;

function GoalSpectrum({ percent, label }: { percent: number; label: string }) {
  const boundedPercent = Math.min(Math.max(percent, 0), 200);
  const markerPosition = boundedPercent / 2;
  return (
    <div className="goal-spectrum-wrap">
      <div
        className="goal-spectrum"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={200}
        aria-valuenow={boundedPercent}
        aria-valuetext={`${Math.round(percent)}% of goal`}
      >
        <span
          className="goal-spectrum-marker"
          style={{ left: `${markerPosition}%` }}
        />
      </div>
      <div className="goal-spectrum-labels" aria-hidden="true">
        <span>Below</span>
        <strong>Goal</strong>
        <span>Over</span>
      </div>
    </div>
  );
}

function NutrientTargetSpectrum({
  amount,
  target,
  label,
}: {
  amount: number;
  target: DailyTarget;
  label: string;
}) {
  const minimum =
    target.minimum_amount === null ? null : Number(target.minimum_amount);
  const maximum =
    target.maximum_amount === null ? null : Number(target.maximum_amount);
  const reference = Number(target.target_amount ?? minimum ?? maximum ?? 1);
  const scaleMaximum = Math.max(
    maximum !== null
      ? maximum * 1.25
      : minimum !== null
        ? minimum * 2
        : reference * 2,
    1,
  );
  const markerPosition = Math.min(
    Math.max((amount / scaleMaximum) * 100, 0),
    100,
  );
  const minimumPosition =
    minimum === null ? 0 : Math.min((minimum / scaleMaximum) * 100, 75);
  const maximumPosition =
    maximum === null ? 100 : Math.min((maximum / scaleMaximum) * 100, 80);
  const background =
    minimum !== null && maximum !== null
      ? `linear-gradient(90deg, #c62828 0%, #f6c344 ${Math.max(minimumPosition - 7, minimumPosition * 0.75)}%, #39a852 ${minimumPosition}%, #15803d ${maximumPosition}%, #f6c344 ${Math.min(maximumPosition + 7, 92)}%, #c62828 100%)`
      : minimum !== null
        ? `linear-gradient(90deg, #c62828 0%, #ef6c00 ${minimumPosition * 0.55}%, #f6c344 ${minimumPosition * 0.8}%, #39a852 ${minimumPosition}%, #15803d 100%)`
        : `linear-gradient(90deg, #15803d 0%, #39a852 ${maximumPosition}%, #f6c344 ${Math.min(maximumPosition + 7, 92)}%, #c62828 100%)`;
  const recommendation =
    minimum !== null && maximum !== null
      ? `${minimum.toFixed(1)} to ${maximum.toFixed(1)}`
      : minimum !== null
        ? `at least ${minimum.toFixed(1)}`
        : `no more than ${(maximum ?? reference).toFixed(1)}`;
  return (
    <div className="goal-spectrum-wrap">
      <div
        className="goal-spectrum"
        style={{ background }}
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={scaleMaximum}
        aria-valuenow={Math.min(Math.max(amount, 0), scaleMaximum)}
        aria-valuetext={`${amount.toFixed(1)}; recommended ${recommendation}`}
      >
        <span
          className="goal-spectrum-marker"
          style={{ left: `${markerPosition}%` }}
        />
      </div>
      <div className="goal-spectrum-labels" aria-hidden="true">
        <span>{minimum !== null ? `<${minimum.toFixed(1)}` : "Lower"}</span>
        <strong>
          {minimum !== null && maximum !== null
            ? `${minimum.toFixed(1)}–${maximum.toFixed(1)}`
            : minimum !== null
              ? `≥${minimum.toFixed(1)}`
              : `≤${(maximum ?? reference).toFixed(1)}`}
        </strong>
        <span>{maximum !== null ? `>${maximum.toFixed(1)}` : "More"}</span>
      </div>
    </div>
  );
}

function NutrientCard({
  target,
  total,
  include,
  date,
}: {
  target: DailyTarget;
  total?: DailyTotal;
  include: boolean;
  date: string;
}) {
  const amount = total
    ? include
      ? total.total_including_projections
      : total.total_excluding_projections
    : 0;
  const hasFoodData = Boolean(
    total && total.food_count > 0 && total.missing_count < total.food_count,
  );
  const percent = hasFoodData ? targetPercent(amount, target) : null;
  const dataCoveragePercent = total?.food_count
    ? Math.round(
        ((total.food_count - total.missing_count) / total.food_count) * 100,
      )
    : 0;
  const progressPercent = percent ?? dataCoveragePercent;
  const isDataCoverage = percent === null;
  const status = hasFoodData
    ? targetStatus(amount, target)
    : "Missing nutrient data";
  const statusClass =
    status.startsWith("Below") || status.startsWith("Above")
      ? "nutrient-alert"
      : "";
  return (
    <Link
      className="card nutrient-row"
      href={`/app/nutrients/${target.nutrients.key}?date=${date}`}
    >
      <div>
        <strong>{target.nutrients.name}</strong>
        <p className={statusClass}>
          {hasFoodData
            ? `${amount.toFixed(amount < 10 ? 2 : 1)} ${target.nutrients.nutrient_units.symbol} · `
            : ""}
          {status}
        </p>
        {total && total.missing_count > 0 && (
          <small className="muted">
            Incomplete for {total.missing_count} of {total.food_count} logged
            foods
          </small>
        )}
      </div>
      <div>
        {isDataCoverage
          ? `${dataCoveragePercent}% data`
          : `${percent}%${target.minimum_amount !== null ? " min" : " limit"}`}
      </div>
      {isDataCoverage ? (
        <progress
          max="100"
          value={Math.min(progressPercent, 100)}
          aria-label={`${target.nutrients.name} data coverage`}
        />
      ) : (
        <NutrientTargetSpectrum
          amount={amount}
          target={target}
          label={`${target.nutrients.name} recommended intake`}
        />
      )}
    </Link>
  );
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; message?: string }>;
}) {
  const q = await searchParams;
  const date = validDiaryDate(q.date);
  const { supabase, user } = await requireUser();
  const [{ data: profile }, nutrition] = await Promise.all([
    supabase
      .from("profiles")
      .select("onboarding_completed_at,projection_display_mode")
      .eq("id", user.id)
      .single(),
    getDailyNutrition(supabase, date),
  ]);
  if (!profile?.onboarding_completed_at)
    return (
      <>
        <h1>Welcome to Nourish Lens</h1>
        <section className="card">
          <h2>Calculate your personal targets</h2>
          <p className="muted">
            Complete the baseline profile before interpreting daily progress.
          </p>
          <Link className="button" href="/app/onboarding">
            Start onboarding
          </Link>
        </section>
      </>
    );
  const include = profile.projection_display_mode !== "confirmed_only";
  const totalByKey = new Map(
    nutrition.totals.map((total) => [total.nutrient_key, total]),
  );
  const foods = Math.max(
    0,
    ...nutrition.totals.map((total) => total.food_count),
  );
  const projected = nutrition.totals.reduce(
    (sum, total) => sum + total.projected_amount,
    0,
  );
  const all = nutrition.totals.reduce(
    (sum, total) => sum + total.total_including_projections,
    0,
  );
  const represented = nutrition.totals.filter(
    (total) => total.food_count > 0 && total.missing_count < total.food_count,
  ).length;
  const excludedRecommendationKeys = new Set([
    "energy_kcal",
    "carbohydrate",
    "fat",
    "sodium",
  ]);
  const missingTargets = nutrition.targets.filter((target) => {
    if (
      excludedRecommendationKeys.has(target.nutrients.key) ||
      ["maximum", "upper_limit", "none"].includes(target.target_type)
    )
      return false;
    const total = totalByKey.get(target.nutrients.key);
    if (
      !total ||
      total.food_count === 0 ||
      total.missing_count >= total.food_count
    )
      return false;
    const amount = include
      ? total.total_including_projections
      : total.total_excluding_projections;
    return targetStatus(amount, target) === "Below target";
  });
  const nutrientGaps = missingTargets
    .map((target) => {
      const total = totalByKey.get(target.nutrients.key)!;
      const amount = include
        ? total.total_including_projections
        : total.total_excluding_projections;
      const progressPercent = Math.max(
        0,
        Math.min(targetPercent(amount, target) ?? 0, 100),
      );
      return {
        key: target.nutrients.key,
        name: target.nutrients.name,
        progressPercent,
        deficitWeight: (100 - progressPercent) / 100,
      };
    })
    .sort((a, b) => a.progressPercent - b.progressPercent);
  const progressFor = (key: string) => {
    const target = nutrition.targets.find((item) => item.nutrients.key === key);
    const total = totalByKey.get(key);
    if (!target || !total || total.missing_count >= total.food_count)
      return null;
    const value = include
      ? total.total_including_projections
      : total.total_excluding_projections;
    return { value, percent: targetPercent(value, target), target };
  };
  const calories = progressFor("energy_kcal");
  const categoryMetrics = groups.map((group) => {
    const targets = nutrition.targets.filter(
      (target) => target.nutrients.nutrient_categories.key === group.key,
    );
    const reported = targets.filter((target) => {
      const total = totalByKey.get(target.nutrients.key);
      return (
        total && total.food_count > 0 && total.missing_count < total.food_count
      );
    });
    const goalAlignment = targets.flatMap((target) => {
      if (["informational", "none"].includes(target.target_type)) return [];
      const total = totalByKey.get(target.nutrients.key);
      if (
        !total ||
        total.food_count === 0 ||
        total.missing_count >= total.food_count
      )
        return [];
      const value = include
        ? total.total_including_projections
        : total.total_excluding_projections;
      const percent = targetAlignmentPercent(value, target);
      return percent === null
        ? []
        : [
            {
              percent,
              withinTarget: ["Within target", "Near maximum"].includes(
                targetStatus(value, target),
              ),
            },
          ];
    });
    const usesGoals = goalAlignment.length > 0;
    const percent = usesGoals
      ? Math.round(
          goalAlignment.reduce((sum, item) => sum + item.percent, 0) /
            goalAlignment.length,
        )
      : targets.length
        ? Math.round((reported.length / targets.length) * 100)
        : 0;
    return {
      ...group,
      percent,
      usesGoals,
      detail: usesGoals
        ? `${goalAlignment.filter((item) => item.withinTarget).length} of ${goalAlignment.length} within target`
        : `${reported.length} of ${targets.length} items reported`,
      href: `#category-${group.key}`,
    };
  });
  const calorieMetric = {
    key: "calories",
    title: "Calories",
    percent: calories
      ? (targetAlignmentPercent(calories.value, calories.target) ?? 0)
      : 0,
    usesGoals: Boolean(calories),
    detail: calories
      ? `${Math.round(calories.value).toLocaleString()} kcal logged`
      : "No usable calorie data",
    href: `/app/nutrients/energy_kcal?date=${date}`,
  };
  const recommendedFoods = await getGapFoodRecommendations(
    supabase,
    nutrientGaps,
    10,
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">DAILY OVERVIEW</p>
          <h1>Your nutrition</h1>
        </div>
        <DateSelector date={date} action="/app" />
      </div>
      {q.message && <p role="status">{q.message}</p>}
      <section className="category-progress-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CATEGORY PROGRESS</p>
            <h2>Progress across everything you track</h2>
          </div>
          <span>
            Target alignment where ranges exist · data coverage otherwise
          </span>
        </div>
        <div className="category-progress-rows">
          {[
            [calorieMetric, ...categoryMetrics.slice(0, 4)],
            categoryMetrics.slice(4),
          ].map((row, rowIndex) => (
            <div
              className={`category-progress-grid category-progress-grid-${rowIndex === 0 ? "primary" : "secondary"}`}
              key={rowIndex}
            >
              {row.map((metric) => (
                <Link
                  className="card category-progress-card"
                  href={metric.href}
                  key={metric.key}
                >
                  <div>
                    <span className="category-progress-icon">
                      <Gauge aria-hidden="true" />
                    </span>
                    <span className="category-progress-mode">
                      {metric.usesGoals ? "Target alignment" : "Data coverage"}
                    </span>
                  </div>
                  <strong>{metric.percent}%</strong>
                  <h3>{metric.title}</h3>
                  <small>{metric.detail}</small>
                  {metric.usesGoals ? (
                    <GoalSpectrum
                      percent={metric.percent}
                      label={`${metric.title} target alignment`}
                    />
                  ) : (
                    <progress
                      max="100"
                      value={metric.percent}
                      aria-label={`${metric.title} data coverage`}
                    />
                  )}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </section>
      {projected > 0 && (
        <p className="dashboard-quality-note">
          Some displayed totals include clearly labeled estimates.{" "}
          <Link href="/app/projections">Review how estimates are used.</Link>
        </p>
      )}
      <p>
        <Link href="/app/projections">
          Viewing{" "}
          {include ? "eligible projections" : "confirmed and calculated only"} ·
          Change
        </Link>
      </p>
      <section className="summary-grid dashboard-summary">
        <div className="card">
          <span>Foods logged</span>
          <strong>{foods}</strong>
        </div>
        <div className="card">
          <span>Projection dependency</span>
          <strong>
            {all > 0 ? `${Math.round((projected / all) * 1000) / 10}%` : "0%"}
          </strong>
          <small>Across tracked nutrient amounts</small>
        </div>
        <div className="card">
          <span>Nutrients represented</span>
          <strong>
            {nutrition.targets.length
              ? `${represented}/${nutrition.targets.length}`
              : "—"}
          </strong>
          <small>Missing data is not counted as zero</small>
        </div>
      </section>
      {groups.map((group) => {
        const targets = nutrition.targets.filter(
          (target) => target.nutrients.nutrient_categories.key === group.key,
        );
        if (!targets.length) return null;
        return (
          <section
            id={`category-${group.key}`}
            className={`nutrient-section nutrient-section-${group.key}`}
            key={group.key}
          >
            <div className="section-heading">
              <h2>{group.title}</h2>
              <span>{targets.length} tracked</span>
            </div>
            <div className="progress-list nutrient-card-grid">
              {targets.map((target) => (
                <NutrientCard
                  key={target.nutrient_id}
                  target={target}
                  total={totalByKey.get(target.nutrients.key)}
                  include={include}
                  date={date}
                />
              ))}
            </div>
          </section>
        );
      })}
      <section className="nutrient-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">PERSONALIZED FOOD IDEAS</p>
            <h2>Top foods for today&apos;s nutrient gaps</h2>
          </div>
          <span>{nutrientGaps.length} nutrients below target</span>
        </div>
        {nutrientGaps.length > 0 && (
          <div className="quality nutrient-gap-list">
            {nutrientGaps.map((gap) => (
              <span key={gap.key}>
                <strong>{gap.name}</strong> {gap.progressPercent}% of goal ·{" "}
                {100 - gap.progressPercent}% remaining
              </span>
            ))}
          </div>
        )}
        <p className="muted">
          Foods are weighted most heavily toward your largest deficits. A
          nutrient at 5% of goal influences the ranking more than one at 70%.
        </p>
        <FoodRecommendations
          foods={recommendedFoods}
          emptyMessage={
            foods === 0
              ? "Log foods first so the dashboard can identify real nutrient gaps."
              : "No food recommendations are needed from the currently represented minimum targets."
          }
        />
      </section>
      <p className="card muted">
        Targets are educational reference values, not medical advice. A missing
        value means the logged food did not provide that nutrient—not that the
        food contains zero.
      </p>
    </>
  );
}
