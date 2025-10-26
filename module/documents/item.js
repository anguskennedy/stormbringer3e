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
      
      case "weapon":
        const defaults = game.stormbringer?._itemBase?.weapon ?? {};
        foundry.utils.mergeObject(system, defaults, { overwrite: false, inplace: true });
        // ensure nested structures exist even if _itemBase is missing
        system.length ??= { ft: 0, cm: 0 };
        system.range  ??= { ft: 0, m: 0 };
        system.attack ??= { base: 0, bonus: 0, total: 0 };
        system.parry  ??= { base: 0, bonus: 0, total: 0 };
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
    
    if (this.type === "weapon") {
      const { attack, parry } = system;
      attack.total = Number(attack.base ?? 0) + Number(attack.bonus ?? 0);
      parry.total  = Number(parry.base ?? 0) + Number(parry.bonus ?? 0);

    if (this.actor) {
      const bonuses = this.actor.system?.combat ?? {};
      attack.total += Number(bonuses.attack ?? 0);
      parry.total  += Number(bonuses.parry ?? 0);
    }
  }

    // If this is a type, you could eventually compute its bonus dynamically
    if (this.type === "type" && this.actor) {
      // Placeholder for derived calculations later (e.g., from STR, DEX, POW, SIZ)
      system.bonus = system.bonus ?? 0;
    }
  }
}