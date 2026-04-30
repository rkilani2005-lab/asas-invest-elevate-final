import type { TFunction } from "i18next";

/**
 * Convert a translated array of {q, a} into the {question, answer} shape
 * expected by faqJsonLd().
 */
export function localizedFaq(
  t: TFunction,
  key: string
): Array<{ question: string; answer: string }> {
  const list = t(key, { returnObjects: true }) as Array<{ q: string; a: string }>;
  if (!Array.isArray(list)) return [];
  return list.map((item) => ({ question: item.q, answer: item.a }));
}
