export type StorageLocation = "Fridge" | "Freezer" | "Pantry";

export type PantryItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  location: StorageLocation;
  expiresOn: string;
  emoji: string;
};
