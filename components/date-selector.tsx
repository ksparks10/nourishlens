export function DateSelector({
  date,
  action,
}: {
  date: string;
  action: string;
}) {
  return (
    <form className="date-selector" action={action}>
      <label>
        Date
        <input name="date" type="date" defaultValue={date} />
      </label>
      <button>View date</button>
    </form>
  );
}
