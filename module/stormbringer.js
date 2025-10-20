import STORM, { STORM_TYPES } from "./config.js";
import { StormActor } from "./documents/actor.js";
import { StormItem } from "./documents/item.js";
import { StormActorSheet } from "./sheets/actor-sheet.js";
import { StormItemSheet } from "./sheets/item-sheet.js";
import { StormDice } from "./dice.js";

Hooks.once("init", async() => {
  console.log("Stormbringer 3e | Initializing");
  game.stormbringer = {};
  game.system = game.system || {};
  game.system.config = { STORM, STORM_TYPES };

  // Preload base actor data before anything initializes
  const res = await fetch("systems/stormbringer3e/module/data/actor-base.json");
  game.stormbringer._actorBase = await res.json();

  // Define custom document classes
  CONFIG.Actor.documentClass = StormActor;
  CONFIG.Item.documentClass = StormItem;

  // Register sheets
  foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  foundry.documents.collections.Actors.registerSheet("storm", StormActorSheet, {
  makeDefault: true
  });

  foundry.documents.collections.Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);
  foundry.documents.collections.Items.registerSheet("storm", StormItemSheet, {
  makeDefault: true
  });

  // Expose a tiny dice helper
  game.storm = { roll: StormDice.roll };
});