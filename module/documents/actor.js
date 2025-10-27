export class StormActor extends Actor {
  prepareBaseData() {
    super.prepareBaseData();

    const system = this.system;
    system.attributes ??= {};
    system.resources ??= {};
    system.details ??= {};
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
    } else {
      system.details = system.details || {};
      system.details.description ??= "";
      system.details.habitat ??= "";
      system.narrative = {};
      delete system.attributes.cha;
      delete system.attributes.CHA;
    }
    system.armour ??= {};
    system.armour.name ??= "";
    system.armour.protection ??= "";
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
    if (game.stormbringer?._actorBase) {
      foundry.utils.mergeObject(system, game.stormbringer._actorBase, { overwrite: false });
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

    let hpBase = con;
    if (siz > 12) hpBase += siz - 12;
    else if (siz < 9) hpBase -= 9 - siz;

    const minHp = Math.ceil(con / 2);
    hpBase = Math.max(hpBase, minHp);

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
