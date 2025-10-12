import STORM from "./config.js";
import { StormActor } from "./documents/actor.js";
import { StormItem } from "./documents/item.js";
import { StormActorSheet } from "./sheets/actor-sheet.js";
import { StormItemSheet } from "./sheets/item-sheet.js";
import { StormDice } from "./dice.js";

Hooks.once("init", function() {
  console.log("Stormbringer 3e | Initializing");

  // Define custom document classes
  CONFIG.Actor.documentClass = StormActor;
  CONFIG.Item.documentClass = StormItem;

  // Register sheets
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("storm", StormActorSheet, { makeDefault: true, label: game.i18n.localize("STORM.sheet.actor") });

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("storm", StormItemSheet, { makeDefault: true, label: game.i18n.localize("STORM.sheet.item") });

  // Expose a tiny dice helper
  game.storm = { roll: StormDice.roll };
});