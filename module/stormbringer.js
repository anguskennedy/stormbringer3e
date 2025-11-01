import STORM, { STORM_TYPES, SUMMONING_SUBTYPES } from "./config.js";
import { StormActor } from "./documents/actor.js";
import { StormCreature } from "./documents/creature.js";
import { StormItem } from "./documents/item.js";
import { StormActorSheet } from "./sheets/actor-sheet.js";
import { StormCreatureSheet } from "./sheets/creature-sheet.js";
import { StormItemSheet } from "./sheets/item-sheet.js";

Hooks.once("init", async() => {
  console.log("Stormbringer 3e | Initializing");
  game.stormbringer = {};
  game.system = game.system || {};
  game.system.config = { STORM, STORM_TYPES, SUMMONING_SUBTYPES };

  // Use raw DEX for initiative, highest goes first
  CONFIG.Combat.initiative = {
    formula: "@attributes.DEX",   // path into actor.system
    decimals: 0                   // no fractional tie‑breaker
  };

  // Preload base actor data before anything initializes
  const [actorBaseRes, creatureBaseRes] = await Promise.all([
    fetch("systems/stormbringer3e/module/data/actor-base.json"),
    fetch("systems/stormbringer3e/module/data/creature-base.json")
  ]);
  game.stormbringer._actorBase = await actorBaseRes.json();
  game.stormbringer._creatureBase = await creatureBaseRes.json();

  // Define custom document classes
  CONFIG.Actor.documentClass = StormActor;
  CONFIG.Actor.typeClasses ??= {};
  CONFIG.Actor.typeClasses.creature = StormCreature;
  CONFIG.Item.documentClass = StormItem;

  // Register sheets
  foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  foundry.documents.collections.Actors.registerSheet("storm", StormActorSheet, {
    makeDefault: true,
    types: ["character", "npc"]
  });
  foundry.documents.collections.Actors.registerSheet("storm", StormCreatureSheet, {
    makeDefault: true,
    types: ["creature"]
  });

  foundry.documents.collections.Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);
  foundry.documents.collections.Items.registerSheet("storm", StormItemSheet, {
  makeDefault: true
  });

  game.storm = {};
});

Hooks.on("renderChatMessage", (message, html) => {
  const pushData = message.getFlag("stormbringer3e", "pushData");
  if (!pushData) return;

  const button = html.find("[data-action='push-roll']");
  if (!button.length) return;

  if (pushData.used) {
    button.remove();
    return;
  }

  button.on("click", async event => {
    event.preventDefault();
    const target = Number(pushData.target ?? 0) || 0;
    const actorId = pushData.actorId;
    let actor = actorId ? game.actors?.get(actorId) : null;

    if (!actor && pushData.speaker?.token) {
      const token = canvas?.tokens?.placeables?.find(t => t.id === pushData.speaker.token);
      actor = token?.actor ?? actor;
    }

    if (!actor) {
      ui.notifications?.warn?.("Unable to resolve actor for pushed roll.");
      button.remove();
      try {
        await message.setFlag("stormbringer3e", "pushData.used", true);
      } catch (error) {
        console.warn("Stormbringer3e | Failed to update push flag", error);
      }
      return;
    }

    button.prop("disabled", true);

    const roll = await new Roll("1d100").evaluate({ async: true });
    const outcome = StormActorSheet.evaluateD100Roll(target, roll.total);
    const resultLabel = StormActorSheet.formatRollResult(outcome);
    const label = pushData.label ?? (typeof message.flavor === "string" ? message.flavor : "Check");
    const flavor = `${label} (Pushed) → ${resultLabel}`;

    await StormActorSheet.sendD100RollMessage({
      actor,
      roll,
      flavor,
      label,
      target,
      resultLabel,
      allowPush: false,
      isPush: true,
      speaker: pushData.speaker
    });

    try {
      await message.setFlag("stormbringer3e", "pushData.used", true);
    } catch (error) {
      console.warn("Stormbringer3e | Failed to update push flag", error);
    }
    button.remove();
  });
});
