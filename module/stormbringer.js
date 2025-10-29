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
