export class StormActor extends Actor {
  prepareBaseData() {
    super.prepareBaseData();

    const system = this.system;
    system.attributes ??= {};
    system.resources ??= {};
    system.details ??= {};
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
