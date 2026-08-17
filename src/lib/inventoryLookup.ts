import { MODEL_INVENTORY, type OutfitItem } from "@/data/inventory";

let _index: Map<string, OutfitItem> | null = null;

function index(): Map<string, OutfitItem> {
  if (!_index) {
    _index = new Map();
    for (const model of MODEL_INVENTORY) {
      for (const item of model.outfit) _index.set(item.id, item);
    }
  }
  return _index;
}

export function getInventoryItem(itemId: string): OutfitItem | null {
  return index().get(itemId) ?? null;
}
