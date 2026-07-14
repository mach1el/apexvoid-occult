import { expect, test } from "vitest";
import { getElement } from "./elements";

test("Element of Tân is Kim and different from Thổ", () => {
  const tanElement = getElement("Tân");
  const mauElement = getElement("Mậu");
  expect(tanElement).toBe("Kim");
  expect(mauElement).toBe("Thổ");
  expect(tanElement).not.toBe(mauElement);
});
