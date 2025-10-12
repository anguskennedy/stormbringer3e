export class StormActor extends Actor {
  prepareBaseData() {
    super.prepareBaseData();

    const system = this.system;
    system.attributes ??= {};
    system.resources ??= {};

    // Merge defaults from preloaded cache
    if (game.stormbringer?._actorBase) {
      foundry.utils.mergeObject(system, game.stormbringer._actorBase, { overwrite: false });
    }
  }

  prepareDerivedData() {
    const { attributes = {}, resources = {} } = this.system;
    const con = Number(attributes.con ?? 10);
    resources.hp ??= {};
    resources.hp.max = con;
    resources.hp.value = Math.min(resources.hp.value ?? con, con);
  }
}