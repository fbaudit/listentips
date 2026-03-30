import type { ReactNode } from "react";
import type { CardId } from "./types";

interface CardElements {
  submit: ReactNode;
  check: ReactNode;
  content: ReactNode | null;
}

/**
 * Render cards according to cardOrder.
 * When submit and check are adjacent, wrap them in a provided grid layout.
 */
export function renderOrderedCards(
  cardOrder: CardId[],
  cards: CardElements,
  gridWrapper: (children: ReactNode) => ReactNode
): ReactNode[] {
  const elements: ReactNode[] = [];
  let i = 0;

  while (i < cardOrder.length) {
    const curr = cardOrder[i];
    const next = cardOrder[i + 1];

    // Group submit+check into a grid when adjacent
    if (
      (curr === "submit" && next === "check") ||
      (curr === "check" && next === "submit")
    ) {
      elements.push(
        <div key={`grid-${i}`}>
          {gridWrapper(
            <>
              <div>{cards[curr]}</div>
              <div>{cards[next]}</div>
            </>
          )}
        </div>
      );
      i += 2;
    } else {
      const node = cards[curr];
      if (node) {
        elements.push(<div key={`card-${i}`}>{node}</div>);
      }
      i++;
    }
  }

  return elements;
}
