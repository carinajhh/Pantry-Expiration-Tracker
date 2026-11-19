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

export type PantryImpact = {
  usedThisMonth: number;
  tossedThisMonth: number;
  monthlyGoal: number;
  recentActivity: PantryActivity[];
};

export type PantryRemovalOutcome = "used" | "tossed";

export type PantryActivity = {
  id: string;
  action: PantryRemovalOutcome;
  itemName: string;
  itemQuantity: number;
  occurredAt: string;
};
