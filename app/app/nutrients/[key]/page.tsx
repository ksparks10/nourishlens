import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/authorization";
import {
  getDailyNutrition,
  targetPercent,
  targetStatus,
  type DailyTotal,
} from "@/lib/nutrition/daily";
import { validDiaryDate } from "@/lib/validation/diary";
import { DateSelector } from "@/components/date-selector";
import { getFoodRecommendations } from "@/lib/nutrition/recommendations";
import { FoodRecommendations } from "@/components/food-recommendations";
import { getNutrientEducation } from "@/lib/nutrition/education";
import {
  Atom,
  BookOpen,
  ChartNoAxesColumnIncreasing,
  CircleHelp,
  ExternalLink,
  HeartPulse,
  Salad,
} from "lucide-react";

type Snapshot = {
  amount: number | null;
  value_classification: string;
  nutrients: { key: string };
};
type DiaryEntry = {
  id: string;
  food_name_snapshot: string;
  brand_snapshot: string | null;
  gram_weight: number;
  meal_entry_nutrient_snapshots: Snapshot[];
};
type DiaryMeal = {
  meal_types: { name: string };
  meal_entries: DiaryEntry[];
};
type DiaryDay = { meals: DiaryMeal[] };

function NutrientTabs({
  keyName,
  date,
  active,
}: {
  keyName: string;
  date: string;
  active: "intake" | "nutrition";
}) {
  return (
    <nav className="nutrient-tabs" aria-label="Nutrient information tabs">
      <Link
        aria-current={active === "intake" ? "page" : undefined}
        href={`/app/nutrients/${keyName}?date=${date}`}
      >
        <ChartNoAxesColumnIncreasing aria-hidden="true" size={18} />
        <span>
          <strong>Your intake</strong>
          <small>Totals and food breakdown</small>
        </span>
      </Link>
      <Link
        aria-current={active === "nutrition" ? "page" : undefined}
        href={`/app/nutrients/${keyName}?date=${date}&tab=nutrition`}
      >
        <BookOpen aria-hidden="true" size={18} />
        <span>
          <strong>About this nutrient</strong>
          <small>Benefits, foods, and chemistry</small>
        </span>
      </Link>
    </nav>
  );
}

export default async function NutrientDetail({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ date?: string; tab?: string }>;
}) {
  const { key } = await params;
  const query = await searchParams;
  const date = validDiaryDate(query.date);
  const { supabase, user } = await requireUser();
  const [nutrition, { data: profile }, { data: diaryData }] = await Promise.all(
    [
      getDailyNutrition(supabase, date),
      supabase
        .from("profiles")
        .select("projection_display_mode")
        .eq("id", user.id)
        .single(),
      supabase
        .from("diary_days")
        .select(
          "meals(meal_types(name),meal_entries(id,food_name_snapshot,brand_snapshot,gram_weight,meal_entry_nutrient_snapshots(amount,value_classification,nutrients(key))))",
        )
        .eq("user_id", user.id)
        .eq("diary_date", date)
        .maybeSingle(),
    ],
  );
  const target = nutrition.targets.find((item) => item.nutrients.key === key);
  if (!target) notFound();
  const total: DailyTotal = nutrition.totals.find(
    (item) => item.nutrient_id === target.nutrient_id,
  ) ?? {
    nutrient_id: target.nutrient_id,
    nutrient_key: key,
    nutrient_name: target.nutrients.name,
    unit: target.nutrients.nutrient_units.symbol,
    confirmed_amount: 0,
    calculated_amount: 0,
    projected_amount: 0,
    user_entered_amount: 0,
    total_excluding_projections: 0,
    total_including_projections: 0,
    missing_count: 0,
    food_count: 0,
  };
  const education = getNutrientEducation(
    key,
    total.nutrient_name,
    target.nutrients.nutrient_categories.key,
  );
  if (query.tab === "nutrition")
    return (
      <>
        <div className="page-heading">
          <div>
            <p className="eyebrow">NUTRIENT GUIDE</p>
            <h1>{total.nutrient_name}</h1>
          </div>
          <DateSelector date={date} action={`/app/nutrients/${key}`} />
        </div>
        <NutrientTabs keyName={key} date={date} active="nutrition" />
        <section className="nutrient-guide-hero">
          <span className="guide-category">
            {target.nutrients.nutrient_categories.name}
          </span>
          <p className="eyebrow">QUICK GUIDE</p>
          <h2>Understanding {total.nutrient_name}</h2>
          <p>{education.overview}</p>
        </section>
        <div className="nutrient-guide-grid">
          <section className="card guide-card">
            <div className="guide-card-heading">
              <span className="guide-icon">
                <HeartPulse aria-hidden="true" />
              </span>
              <div>
                <span>BODY</span>
                <h2>What it helps with</h2>
              </div>
            </div>
            <ul className="guide-list">
              {education.roles.map((role) => (
                <li key={role}>{role}</li>
              ))}
            </ul>
          </section>
          <section className="card guide-card">
            <div className="guide-card-heading">
              <span className="guide-icon">
                <Salad aria-hidden="true" />
              </span>
              <div>
                <span>DIET</span>
                <h2>Where it comes from</h2>
              </div>
            </div>
            <ul className="guide-list">
              {education.foodSources.map((source) => (
                <li key={source}>{source}</li>
              ))}
            </ul>
            <Link
              className="guide-action"
              href={`/app/nutrients/${key}?date=${date}`}
            >
              View your sources and recommendations{" "}
              <span aria-hidden="true">→</span>
            </Link>
          </section>
          <section className="card guide-card guide-card-wide guide-chemistry">
            <div className="guide-card-heading">
              <span className="guide-icon">
                <Atom aria-hidden="true" />
              </span>
              <div>
                <span>SCIENCE</span>
                <h2>Chemical identity and structure</h2>
              </div>
            </div>
            <p className="guide-lead">{education.chemistry}</p>
            {education.chemicalQuery && (
              <a
                className="guide-action"
                href={`https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(education.chemicalQuery)}`}
                target="_blank"
                rel="noreferrer"
              >
                Explore 2D and 3D structure in NIH PubChem
                <ExternalLink aria-hidden="true" size={15} />
              </a>
            )}
          </section>
          <section className="card guide-card">
            <div className="guide-card-heading">
              <span className="guide-icon">
                <CircleHelp aria-hidden="true" />
              </span>
              <div>
                <span>CONTEXT</span>
                <h2>Good to know</h2>
              </div>
            </div>
            <ul className="guide-list">
              {education.practicalNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </section>
          <section className="card guide-card">
            <div className="guide-card-heading">
              <span className="guide-icon">
                <BookOpen aria-hidden="true" />
              </span>
              <div>
                <span>SOURCES</span>
                <h2>Continue learning</h2>
              </div>
            </div>
            <div className="guide-references">
              {education.references.map((reference) => (
                <a
                  key={reference.href}
                  href={reference.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>{reference.label}</span>
                  <ExternalLink aria-hidden="true" size={15} />
                </a>
              ))}
            </div>
          </section>
        </div>
      </>
    );
  const include = profile?.projection_display_mode !== "confirmed_only";
  const amount = include
    ? total.total_including_projections
    : total.total_excluding_projections;
  const hasData =
    total.food_count > 0 && total.missing_count < total.food_count;
  const diary = diaryData as unknown as DiaryDay | null;
  const contributions = (diary?.meals ?? [])
    .flatMap((meal) =>
      meal.meal_entries.map((entry) => {
        const snapshot = entry.meal_entry_nutrient_snapshots.find(
          (item) => item.nutrients.key === key,
        );
        const reportedAmount =
          snapshot?.amount === null || snapshot?.amount === undefined
            ? null
            : Number(snapshot.amount);
        const projectionExcluded =
          snapshot?.value_classification === "projected" && !include;
        const displayedAmount = projectionExcluded ? 0 : reportedAmount;
        return {
          ...entry,
          meal: meal.meal_types.name,
          reportedAmount,
          displayedAmount,
          classification: snapshot?.value_classification ?? "not_reported",
          projectionExcluded,
        };
      }),
    )
    .sort(
      (a, b) =>
        (b.displayedAmount ?? -1) - (a.displayedAmount ?? -1) ||
        a.food_name_snapshot.localeCompare(b.food_name_snapshot),
    );
  const recommendedFoods = await getFoodRecommendations(supabase, [key], 10);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">NUTRIENT DETAIL</p>
          <h1>{total.nutrient_name}</h1>
        </div>
        <DateSelector date={date} action={`/app/nutrients/${key}`} />
      </div>
      <NutrientTabs keyName={key} date={date} active="intake" />
      <section className="summary-grid">
        <div className="card">
          <span>Displayed total</span>
          <strong>
            {hasData ? `${amount.toFixed(1)} ${total.unit}` : "Missing data"}
          </strong>
          <small>
            {hasData
              ? targetStatus(amount, target)
              : "Logged foods do not report this nutrient"}{" "}
            ·{" "}
            {include ? "eligible projections included" : "confirmed-only view"}
          </small>
        </div>
        <div className="card">
          <span>Without projections</span>
          <strong>
            {hasData
              ? `${total.total_excluding_projections.toFixed(1)} ${total.unit}`
              : "—"}
          </strong>
        </div>
        <div className="card">
          <span>Target progress</span>
          <strong>
            {hasData ? `${targetPercent(amount, target) ?? "—"}%` : "—"}
          </strong>
        </div>
      </section>
      <section className="card">
        <h2>Data composition</h2>
        <dl className="nutrient-grid">
          <div>
            <dt>Confirmed</dt>
            <dd>
              {total.confirmed_amount.toFixed(1)} {total.unit}
            </dd>
          </div>
          <div>
            <dt>Calculated</dt>
            <dd>
              {total.calculated_amount.toFixed(1)} {total.unit}
            </dd>
          </div>
          <div>
            <dt>Projected</dt>
            <dd>
              {total.projected_amount.toFixed(1)} {total.unit}
            </dd>
          </div>
          <div>
            <dt>Foods missing data</dt>
            <dd>
              {total.missing_count} of {total.food_count}
            </dd>
          </div>
        </dl>
        {total.projected_amount > 0 && (
          <p>
            <span className="projection-mark">Includes projection</span>{" "}
            Projected share:{" "}
            {Math.round(
              (total.projected_amount / total.total_including_projections) *
                1000,
            ) / 10}
            %.
          </p>
        )}
        <p className="muted">
          Missing nutrient data is never treated as zero. Projection method,
          confidence, range, and ID are preserved in food-log snapshots.
        </p>
      </section>
      <section className="card">
        <h2>Target methodology</h2>
        <p>{target.target_methodologies.name}</p>
        <p className="muted">{target.target_methodologies.source_name}</p>
      </section>
      <section className="nutrient-section">
        <div className="section-heading">
          <h2>Where your {total.nutrient_name.toLowerCase()} came from</h2>
          <span>{contributions.length} foods logged</span>
        </div>
        {contributions.length ? (
          <div className="progress-list">
            {contributions.map((item) => {
              const share =
                item.displayedAmount !== null && amount > 0
                  ? (item.displayedAmount / amount) * 100
                  : null;
              return (
                <div className="card nutrient-row" key={item.id}>
                  <div>
                    <strong>{item.food_name_snapshot}</strong>
                    <p className="muted">
                      {item.brand_snapshot ?? "Generic"} · {item.meal} ·{" "}
                      {Number(item.gram_weight).toFixed(1)} g eaten
                    </p>
                    {item.projectionExcluded && (
                      <small className="muted">
                        Projected value excluded from the displayed total
                      </small>
                    )}
                    {item.reportedAmount === null && (
                      <small className="muted">
                        This food does not report{" "}
                        {total.nutrient_name.toLowerCase()}
                      </small>
                    )}
                  </div>
                  <div>
                    <strong>
                      {item.reportedAmount === null
                        ? "Missing"
                        : `${item.reportedAmount.toFixed(item.reportedAmount < 10 ? 2 : 1)} ${total.unit}`}
                    </strong>
                    <small>
                      {share === null ? "—" : `${share.toFixed(1)}% of total`}
                    </small>
                  </div>
                  <progress
                    max="100"
                    value={Math.min(share ?? 0, 100)}
                    aria-label={`${item.food_name_snapshot} contribution`}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card">
            <p>No foods were logged for this date.</p>
          </div>
        )}
      </section>
      <section className="nutrient-section">
        <div className="section-heading">
          <h2>Foods rich in {total.nutrient_name}</h2>
          <span>Top {recommendedFoods.length}</span>
        </div>
        <p className="muted">
          Ranked by nutrient amount per 100 g relative to your target.
          Supplements are excluded from this food list.
        </p>
        <FoodRecommendations
          foods={recommendedFoods}
          emptyMessage={`No catalog foods currently report ${total.nutrient_name}.`}
        />
      </section>
    </>
  );
}
