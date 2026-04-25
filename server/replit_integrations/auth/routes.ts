import type { Express } from "express";
import { authStorage, UserPreferences } from "./storage";
import { isAuthenticated } from "./replitAuth";

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get user preferences
  app.get("/api/auth/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const preferences = await authStorage.getPreferences(userId);
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching preferences:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  // Update user preferences
  app.put("/api/auth/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updates = req.body as Partial<UserPreferences>;
      
      // Validate theme if provided
      if (updates.theme !== undefined && !["light", "dark", "system"].includes(updates.theme)) {
        return res.status(400).json({ message: "Invalid theme value" });
      }
      
      // Validate usage alert threshold if provided
      if (updates.usageAlertThresholdCents !== undefined) {
        if (typeof updates.usageAlertThresholdCents !== "number" || updates.usageAlertThresholdCents < 0) {
          return res.status(400).json({ message: "Invalid usage alert threshold" });
        }
      }
      
      const preferences = await authStorage.updatePreferences(userId, updates);
      res.json(preferences);
    } catch (error) {
      console.error("Error updating preferences:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });
}
