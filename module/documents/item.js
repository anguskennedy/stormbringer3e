export class StormItem extends Item {
  /** @override */
  prepareBaseData() {
    const system = this.system;

    // Initialize fields based on item type
    switch (this.type) {
      case "skill":
        system.type ??= "";  
        system.base ??= 0;
        system.effective ??= 0;
        system.description ??= "";
        break;

      case "type":
        system.bonus ??= 0;
        system.skills ??= [];
        system.description ??= "";
        break;
    }
  }

  /** @override */
  prepareDerivedData() {
    const system = this.system;

    // If this is a skill, derive its effective chance from the type bonus
    if (this.type === "skill" && this.actor) {
      const typeKey = system.type;
      const typeData = game.system.config.STORM_TYPES?.[typeKey];

      const typeBonus = typeData?.bonus ?? 0;
      system.effective = system.base + typeBonus;
    }

    // If this is a type, you could eventually compute its bonus dynamically
    if (this.type === "type" && this.actor) {
      // Placeholder for derived calculations later (e.g., from STR, DEX, POW, SIZ)
      system.bonus = system.bonus ?? 0;
    }
  }
}