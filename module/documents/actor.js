export class StormActor extends Actor {
  prepareBaseData() {
    super.prepareBaseData();

    const system = this.system;
    system.attributes ??= {};
    system.resources ??= {};
    system.types ??= {
      agility: { bonus: 0, skills: ["climb", "dodge"] },
      perception: { bonus: 0, skills: ["see", "listen"]}
    };
    system.skills ??= {};

    // Merge defaults from preloaded cache
    if (game.stormbringer?._actorBase) {
      foundry.utils.mergeObject(system, game.stormbringer._actorBase, { overwrite: false });
    }
  }

  prepareDerivedData() {
    const { attributes = {}, resources = {}, types = {}, skills = {} } = this.system;
    const con = Number(attributes.con ?? 10);
    resources.hp ??= {};
    resources.hp.max = con;
    resources.hp.value = Math.min(resources.hp.value ?? con, con);
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