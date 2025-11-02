import { StormActorSheet } from "./actor-sheet.js";

export class StormNPCSheet extends StormActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["storm", "sheet", "npc"],
      template: "systems/stormbringer3e/templates/npc-sheet.hbs",
      width: 820,
      height: 720
    });
  }

  getData(options) {
    const data = super.getData(options);
    data.actorType = "npc";
    const skillsByType = data.skillsByType ?? {};
    const flatSkills = [];
    for (const value of Object.values(skillsByType)) {
      if (Array.isArray(value)) flatSkills.push(...value);
    }

    const languageGroups = Array.isArray(data.knowLanguages) ? data.knowLanguages : [];
    for (const entry of languageGroups) {
      if (entry?.speak) flatSkills.push(entry.speak);
      if (entry?.read) flatSkills.push(entry.read);
    }

    const locale = game.i18n?.lang ?? "en";
    const collator = new Intl.Collator(locale, { sensitivity: "base" });
    flatSkills.sort((a, b) => collator.compare(a?.name ?? "", b?.name ?? ""));
    data.npcSkills = flatSkills.map(skill => {
      const pickNumber = (...values) => {
        for (const value of values) {
          if (value === null || value === undefined) continue;
          const trimmed = typeof value === "string" ? value.trim() : value;
          if (trimmed === "") continue;
          const numeric = Number(trimmed);
          if (Number.isFinite(numeric)) return numeric;
        }
        return 0;
      };

      const base = pickNumber(skill?.base, skill?.system?.base);
      const bonus = pickNumber(skill?.bonus);
      const baseBonus = pickNumber(skill?.baseBonus);
      let total = pickNumber(
        skill?.total,
        skill?.system?.effective,
        skill?.effective
      );
      if (!Number.isFinite(total) || total === 0) {
        total = base + bonus + baseBonus;
      }

      const id = skill?.id ?? skill?._id ?? "";
      const name = skill?.name ?? "";
      return {
        id,
        name,
        total,
        bonus,
        baseBonus
      };
    });
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    const skillRows = html.find(".npc-skill-row[draggable='true']");
    skillRows.on("dragend", ev => this._onNpcSkillDragEnd(ev));
    skillRows.on("contextmenu", ev => this._onNpcSkillContextMenu(ev));
  }

  async _removeNpcSkill(itemId) {
    if (!itemId) return;
    try {
      await this.actor.deleteEmbeddedDocuments("Item", [itemId]);
    } catch (error) {
      console.error("StormNPCSheet | Failed to remove skill", error);
    }
  }

  _onSkillDragStart(event) {
    const row = event.currentTarget;
    this._npcDraggedSkillId = row?.dataset?.itemId ?? null;
    super._onSkillDragStart(event);
  }

  async _onNpcSkillDragEnd(event) {
    const itemId = this._npcDraggedSkillId;
    this._npcDraggedSkillId = null;
    if (!itemId) return;

    const native = event.originalEvent ?? event;
    const dropEffect = native?.dataTransfer?.dropEffect;
    if (dropEffect && dropEffect !== "none") return;

    const clientX = native?.clientX;
    const clientY = native?.clientY;
    if (clientX === undefined || clientY === undefined) return;

    const sheetElement = this.element?.[0];
    if (!sheetElement) return;
    const { left, right, top, bottom } = sheetElement.getBoundingClientRect();
    const inside = clientX >= left && clientX <= right && clientY >= top && clientY <= bottom;
    if (inside) return;

    await this._removeNpcSkill(itemId);
  }

  async _onNpcSkillContextMenu(event) {
    event.preventDefault();
    const row = event.currentTarget;
    const itemId = row?.dataset?.itemId;
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    const name = item?.name ?? "Skill";

    const confirmed = await Dialog.confirm({
      title: "Remove Skill",
      content: `<p>Remove <strong>${name}</strong> from this NPC?</p>`,
      yes: () => true,
      no: () => false,
      options: { jQuery: false }
    });

    if (!confirmed) return;
    await this._removeNpcSkill(itemId);
  }
}
