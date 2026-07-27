import { toggleFavorite } from "@/app/app/foods/actions";
export function FavoriteButton({
  foodId,
  isFavorite,
}: {
  foodId: string;
  isFavorite: boolean;
}) {
  return (
    <form action={toggleFavorite}>
      <input type="hidden" name="food_id" value={foodId} />
      <button aria-pressed={isFavorite}>
        {isFavorite ? "★ Favorited" : "☆ Add to favorites"}
      </button>
    </form>
  );
}
