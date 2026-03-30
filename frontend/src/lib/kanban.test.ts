import { moveCard, type Column } from "@/lib/kanban";

describe("moveCard", () => {
  const baseColumns: Column[] = [
    { id: "col-a", title: "A", cardIds: ["card-1", "card-2"] },
    { id: "col-b", title: "B", cardIds: ["card-3"] },
  ];

  const mvpColumns: Column[] = [
    { id: "col-backlog", title: "Backlog", cardIds: ["card-1", "card-2"] },
    { id: "col-discovery", title: "Discovery", cardIds: ["card-3"] },
    { id: "col-progress", title: "In Progress", cardIds: ["card-4", "card-5"] },
    { id: "col-review", title: "Review", cardIds: ["card-6"] },
    { id: "col-done", title: "Done", cardIds: ["card-7"] },
  ];

  it("reorders cards in the same column", () => {
    const result = moveCard(baseColumns, "card-2", "card-1");
    expect(result[0].cardIds).toEqual(["card-2", "card-1"]);
  });

  it("moves cards to another column", () => {
    const result = moveCard(baseColumns, "card-2", "card-3");
    expect(result[0].cardIds).toEqual(["card-1"]);
    expect(result[1].cardIds).toEqual(["card-2", "card-3"]);
  });

  it("drops cards to the end of a column", () => {
    const result = moveCard(baseColumns, "card-1", "col-b");
    expect(result[0].cardIds).toEqual(["card-2"]);
    expect(result[1].cardIds).toEqual(["card-3", "card-1"]);
  });

  it("moves cards into the in progress column by column id", () => {
    const result = moveCard(mvpColumns, "card-2", "col-progress");
    expect(result[0].cardIds).toEqual(["card-1"]);
    expect(result[2].cardIds).toEqual(["card-4", "card-5", "card-2"]);
  });

  it("moves cards into the review column by card target", () => {
    const result = moveCard(mvpColumns, "card-2", "card-6");
    expect(result[0].cardIds).toEqual(["card-1"]);
    expect(result[3].cardIds).toEqual(["card-2", "card-6"]);
  });

  it("returns original columns when moving a non-existent card", () => {
    const result = moveCard(baseColumns, "card-999", "col-b");
    expect(result).toEqual(baseColumns);
  });

  it("returns original columns when moving to a non-existent column", () => {
    const result = moveCard(baseColumns, "card-1", "col-z");
    expect(result).toEqual(baseColumns);
  });

  it("returns original columns when moving a card to its current position", () => {
    const columns: Column[] = [
      { id: "col-a", title: "A", cardIds: ["card-1"] },
      { id: "col-b", title: "B", cardIds: ["card-3"] },
    ];
    const result = moveCard(columns, "card-1", "card-1");
    expect(result).toEqual(columns);
  });
});
