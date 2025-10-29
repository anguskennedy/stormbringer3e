export class StormActor extends Actor {
  prepareBaseData() {
    super.prepareBaseData();

    const system = this.system;
    system.attributes ??= {};
    system.resources ??= {};
    system.details ??= {};
    const normalizeAttributes = (keys) => {
      if (!system.attributes) return;
      for (const key of keys) {
        const lower = key.toLowerCase();
        const upper = key.toUpperCase();
        let value;
        if (Object.prototype.hasOwnProperty.call(system.attributes, upper)) {
          value = system.attributes[upper];
        } else if (Object.prototype.hasOwnProperty.call(system.attributes, lower)) {
          value = system.attributes[lower];
        } else {
          continue;
        }
        const numeric = Number(value);
        const finalValue = Number.isFinite(numeric) ? numeric : 0;
        system.attributes[upper] = finalValue;
        if (lower !== upper && Object.prototype.hasOwnProperty.call(system.attributes, lower)) {
          delete system.attributes[lower];
        }
      }
    };
    const baseKey = this.type === "creature" ? "_creatureBase" : "_actorBase";
    const baseData = game.stormbringer?.[baseKey];
    if (baseData) {
      foundry.utils.mergeObject(system, baseData, { overwrite: false });
    }

    if (this.type !== "creature") {
      system.details.sex ??= "";
      system.details.age ??= 0;
      system.details.player ??= "";
      system.details.nationality ??= "";
      system.details.class ??= "";
      system.details.cult ??= "";
      system.details.elan ??= 0;
      system.narrative ??= {};
      system.narrative.description ??= "";
      system.narrative.afflictions ??= "";
      system.narrative.possessions ??= "";
      system.narrative.money ??= "";
      system.narrative.notes ??= "";
      system.narrative.skillNotes ??= "";

      normalizeAttributes(["STR", "CON", "SIZ", "INT", "POW", "DEX", "CHA", "LCK"]);

      const craftSlots = Array.isArray(system.craftSlots) ? system.craftSlots : [];
      const normalizedSlots = craftSlots
        .slice(0, 2)
        .map(value => (typeof value === "string" && value.trim().length ? value : null));
      while (normalizedSlots.length < 2) normalizedSlots.push(null);
      system.craftSlots = normalizedSlots;
      delete system.crafts;
    } else {
      system.details = system.details || {};
      system.details.description ??= "";
      system.details.habitat ??= "";
      system.narrative = {};
      delete system.attributes.cha;
      delete system.attributes.CHA;
      delete system.attributes.lck;
      delete system.attributes.LCK;
      delete system.craftSlots;
      delete system.crafts;
      normalizeAttributes(["STR", "CON", "SIZ", "INT", "POW", "DEX"]);
    }
    system.armour ??= {};
    system.armour.name ??= "";
    if (this.type === "creature") {
      system.armour.protection ??= 0;
      let creatureWeapons = system.creatureWeapons;
      if (Array.isArray(creatureWeapons)) {
        creatureWeapons = [...creatureWeapons];
      } else if (creatureWeapons && typeof creatureWeapons === "object") {
        const sortedKeys = Object.keys(creatureWeapons)
          .filter(k => !Number.isNaN(Number(k)))
          .sort((a, b) => Number(a) - Number(b));
        creatureWeapons = sortedKeys.map(k => creatureWeapons[k]);
      } else {
        creatureWeapons = [];
      }
      system.creatureWeapons = creatureWeapons
        .map(w => ({
          name: String(w?.name ?? "").trim(),
          attack: Number(w?.attack ?? 0) || 0,
          damage: String(w?.damage ?? "").trim(),
          parry: Number(w?.parry ?? 0) || 0
        }))
        .filter(w => w.name || w.damage || w.attack || w.parry);
    } else {
      system.armour.protection ??= "";
    }
    if (this.type === "creature") {
      system.resources ??= {};
      system.resources.hp ??= {};
      system.resources.hp.mode ??= "auto";
      system.resources.hp.override ??= "";
    }
    system.skillBonuses ??= {};
    if (this.type !== "creature") {
      system.skillBonuses.agility ??= 0;
      system.skillBonuses.percept ??= 0;
      system.skillBonuses.stealth ??= 0;
      system.skillBonuses.know ??= 0;
      system.skillBonuses.manip ??= 0;
      system.skillBonuses.commun ??= 0;
    } else {
      system.skillBonuses = {};
    }
    system.wounds ??= {};
    system.wounds.major ??= 0;
    system.combat ??= {};
    system.combat.attackBonus ??= 0;
    system.combat.parryBonus ??= 0;
    system.combat.damageMods ??= {};
    system.combat.damageMods.hand ??= "";
    system.combat.damageMods.projectile ??= "";
    system.weaponStats ??= {};
    system.types ??= {
      agility: { bonus: 0, skills: ["climb", "dodge"] },
      percept: { bonus: 0, skills: ["see", "listen"]}
    };
    system.skills ??= {};

    // Merge defaults from preloaded cache
    if (this.type !== "creature" && game.stormbringer?._actorBase) {
      foundry.utils.mergeObject(system, game.stormbringer._actorBase, { overwrite: false });
    }

    if (this.type === "character") {
      const currentLuck = system.attributes?.LCK ?? system.attributes?.lck;
      const parsedLuck = Number(currentLuck);
      const luckValue = Number.isFinite(parsedLuck) ? parsedLuck : 10;
      system.attributes ??= {};
      system.attributes.LCK = luckValue;
      if (Object.prototype.hasOwnProperty.call(system.attributes, "lck")) {
        delete system.attributes.lck;
      }
    } else if (system.attributes) {
      delete system.attributes.LCK;
      delete system.attributes.lck;
    }
  }

  prepareDerivedData() {
    const { attributes = {}, resources = {}, wounds = {} } = this.system;

    const getAttr = (key, fallback) => {
      if (!key) return fallback;
      const variants = [key, key.toLowerCase(), key.toUpperCase()];
      for (const variant of variants) {
        if (Object.prototype.hasOwnProperty.call(attributes, variant)) {
          const value = Number(attributes[variant]);
          if (!Number.isNaN(value)) return value;
        }
      }
      return fallback;
    };

    const con = getAttr("con", 10);
    const siz = getAttr("siz", 10);
    const str = getAttr("str", 10);
    const pow = getAttr("pow", 10);
    const cha = getAttr("cha", 10);
    const dex = getAttr("dex", 10);
    const int = getAttr("int", 10);
    const age = Number(this.system.details?.age ?? 0);
    const charClass = (this.system.details?.class ?? "").toLowerCase();

    let hpBase;
    if (this.type === "creature") {
      const hpMode = this.system.resources?.hp?.mode ?? "auto";
      const override = this.system.resources?.hp?.override ?? "";
      hpBase = this._computeCreatureHp(con, siz, hpMode, override);
      resources.hp ??= {};
      resources.hp.mode = hpMode;
      resources.hp.override ??= override;
    } else {
      hpBase = con;
      if (siz > 12) hpBase += siz - 12;
      else if (siz < 9) hpBase -= 9 - siz;

      const minHp = Math.ceil(con / 2);
      hpBase = Math.max(hpBase, minHp);
    }

    resources.hp ??= {};
    const previousMax = Number(resources.hp.max ?? 0);
    resources.hp.max = hpBase;

    const currentValue = Number(resources.hp.value);
    const hasManualValue = !Number.isNaN(currentValue) && currentValue !== previousMax;

    if (!hasManualValue) {
      resources.hp.value = hpBase;
    } else {
      resources.hp.value = Math.min(currentValue, hpBase);
    }

    this.system.wounds ??= {};
    this.system.wounds.major = Math.ceil(hpBase / 2);

    const attrBonus = (stat) => this._attributeBonus(stat);

    const agilityBonus = attrBonus(str) + attrBonus(pow) + attrBonus(dex) + this._sizeBonus(siz);
    const perceptBonus = attrBonus(int) + attrBonus(pow);
    const stealthBonus = attrBonus(int) + attrBonus(dex) + this._sizeBonus(siz);
    const knowBonus = this._knowledgeBonus(int, age, charClass);
    const manipBonus = attrBonus(str) + attrBonus(int) + attrBonus(pow) + attrBonus(dex);
    const communBonus = attrBonus(cha) + attrBonus(int) + attrBonus(pow);

    this.system.skillBonuses ??= {};
    if (this.type === "creature") {
      this.system.skillBonuses = {};
    } else {
      this.system.skillBonuses.agility = agilityBonus;
      this.system.skillBonuses.percept = perceptBonus;
      this.system.skillBonuses.stealth = stealthBonus;
      this.system.skillBonuses.know = knowBonus;
      this.system.skillBonuses.manip = manipBonus;
      this.system.skillBonuses.commun = communBonus;
    }

    this.system.combat ??= {};
    const damageTotal = Number(str) + Number(siz);
    this.system.combat.damageMods ??= {};
    this.system.combat.damageMods.hand = this._damageMod(damageTotal, 6);
    this.system.combat.damageMods.projectile = this._damageMod(damageTotal, 4);

    if (this.type === "creature") {
      this.system.combat.attackBonus = 0;
      this.system.combat.parryBonus = 0;
    } else {
      this.system.combat.attackBonus = manipBonus;
      this.system.combat.parryBonus = agilityBonus;
    }
  }

  _attributeBonus(value) {
    let bonus = 0;
    if (value > 12) bonus += value - 12;
    if (value < 9) bonus -= 9 - value;
    return bonus;
  }

  _sizeBonus(value) {
    if (value < 9) return 9 - value;
    if (value > 12) return -(value - 12);
    return 0;
  }

  _knowledgeBonus(intValue, age, charClass) {
    let bonus = 0;
    if (intValue > 12) bonus += 2 * (intValue - 12);
    if (intValue < 9) bonus -= 2 * (9 - intValue);

    const ageOver = Math.max(0, age - 25);
    const perYear =
      charClass === "priest" ? 3 :
      charClass === "noble" ? 2 : 1;
    bonus += ageOver * perYear;
    return bonus;
  }

  _computeCreatureHp(con, siz, mode, override) {
    const safe = (val) => Math.max(1, Math.floor(Number(val) || 0));
    const auto = safe(con + siz - 12);

    switch ((mode ?? "auto").toLowerCase()) {
      case "con":
        return safe(con);
      case "conplussix":
        return safe(con + 6);
      case "conplussiz":
        return safe(con + siz);
      case "custom": {
        const custom = Number(override);
        if (!Number.isNaN(custom) && custom > 0) return safe(custom);
        return auto;
      }
      default:
        return auto;
    }
  }

  _damageMod(total, dieSize) {
    const score = Number(total) || 0;
    let steps;
    if (score <= 16) steps = -1;
    else if (score <= 24) steps = 0;
    else if (score <= 40) steps = 1;
    else if (score <= 50) steps = 2;
    else steps = 3;

    if (steps === 0) return "";
    const sign = steps > 0 ? "+" : "-";
    const magnitude = Math.abs(steps);
    return `${sign}${magnitude}d${dieSize}`;
  }
}

async function seedDefaultSkills(actor) {
  const pack = game.packs.get("stormbringer3e.skills");
  if (!pack) return console.error("Skills pack not found");

  const skills = await pack.getDocuments();
  for (let skill of skills) {
    // Only add if actor doesn’t already have it
    if (!actor.items.some(i => i.name === skill.name)) {
      await actor.createEmbeddedDocuments("Item", [
        foundry.utils.deepClone(skill.toObject())
      ]);
    }
  }
}

Hooks.on("createActor", async (actor) => {
  if (actor.type === "character") await seedDefaultSkills(actor);
});
