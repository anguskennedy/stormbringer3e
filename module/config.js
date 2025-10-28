export const STORM = {
  actorTypes: ["character", "npc", "creature"],
  itemTypes: ["skill", "weapon", "armor"],
};

export const SUMMONING_SUBTYPES = {
  elemental: "Elementals",
  demon: "Demons",
  other: "Others"
};

export const STORM_TYPES = {
  agility: {
    name: "Agility",
    description: "The ability to perform acrobatic feats and engate in physical activities which require strength and coordination.",
    attributes: ["str", "pow", "dex", "siz"]
  },
  perception: {
    name: "Perception",
    description: "The ability to use one's senses most effectively.",
    attributes: ["int", "pow"]
  },
  knowledge: {
    name: "Knowledge",
    description: "All the advantage that one gets from education and native ability.",
    attributes: ["int", "age"]
  }
  // ... and so on for the types
};

export default STORM;
