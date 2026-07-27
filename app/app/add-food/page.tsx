import { FoodSearch } from "@/features/foods/food-search";
import { PhotoMealAnalyzer } from "@/features/foods/photo-meal-analyzer";
import { Camera, Search } from "lucide-react";

export default async function AddFood({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <>
      <p className="eyebrow">ADD FOOD</p>
      <h1>How would you like to add food?</h1>
      <p className="muted">
        Search foods, beverages, and supplements in one catalog, or upload a
        photo and let local AI identify the foods for you.
      </p>
      <nav className="add-food-methods" aria-label="Ways to add food">
        <a className="card add-food-method" href="#search-foods">
          <span className="add-food-method-icon">
            <Search aria-hidden="true" />
          </span>
          <span>
            <strong>Search foods and supplements</strong>
            <small>Type a food, dish, supplement, brand, or product</small>
          </span>
        </a>
        <a className="card add-food-method" href="#add-from-photo">
          <span className="add-food-method-icon">
            <Camera aria-hidden="true" />
          </span>
          <span>
            <strong>Use a photo</strong>
            <small>Upload a meal photo for local analysis</small>
          </span>
        </a>
      </nav>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <section className="add-food-section" id="search-foods">
        <div className="section-heading">
          <div>
            <p className="eyebrow">SEARCH BY NAME</p>
            <h2>Find food, drinks, or supplements</h2>
          </div>
        </div>
        <p className="muted">
          Try a simple food such as “eggs,” a drink such as “coffee,” or an
          exact supplement name such as “One A Day Men’s.”
        </p>
        <FoodSearch />
      </section>
      <section className="add-food-section" id="add-from-photo">
        <div className="section-heading">
          <div>
            <p className="eyebrow">LOCAL PHOTO ASSIST</p>
            <h2>Log a meal from a photo</h2>
          </div>
        </div>
        <p className="muted">
          Local AI suggests foods and portions. You review every match before
          anything reaches your food log.
        </p>
        <PhotoMealAnalyzer />
      </section>
    </>
  );
}
