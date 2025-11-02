import { SUMMONING_SUBTYPES } from "../config.js";

const SUMMONING_NAME_FALLBACKS = {
  elemental: ["air", "earth", "fire", "water"],
  demon: ["combat", "desire", "knowledge", "possession", "protection", "travel"]
};

export class StormActorSheet extends foundry.appv1.sheets.ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["storm", "sheet", "actor"],
      template: "systems/stormbringer3e/templates/actor-sheet.hbs",
      width: 980,
      height: 720
    });
  }

  getData(options) {
    const data = super.getData(options);
    const actorData = this.actor.system;

    const skillTypeKeys = ["agility", "percept", "stealth", "know", "summoning", "manip", "commun"];
    const skillsByType = Object.fromEntries(skillTypeKeys.map(key => [key, []]));
    const skillBonuses = foundry.utils.deepClone(actorData.skillBonuses ?? {});
    for (const key of skillTypeKeys) {
      if (skillBonuses[key] === undefined) skillBonuses[key] = 0;
    }

    const locale = game.i18n?.lang ?? "en";
    const collator = new Intl.Collator(locale, { sensitivity: "base" });

    const skillItems = this.actor.items
      .filter(item => item.type === "skill")
      .sort((a, b) => collator.compare(a.name ?? "", b.name ?? ""));

    for (const skill of skillItems) {
      const typeKey = skill.system?.type ?? "";
      if (!skillsByType[typeKey]) skillsByType[typeKey] = [];
      const base = Number(skill.system?.base ?? 0);
      const baseBonus = this._skillBaseOffset(skill.name);
      const bonus = this._skillStartsAtZero(skill.name) ? 0 : Number(skillBonuses[typeKey] ?? 0);
      skillsByType[typeKey].push({
        id: skill.id,
        name: skill.name,
        type: typeKey,
        subtype: String(skill.system?.subtype ?? "").toLowerCase(),
        base,
        bonus,
        baseBonus,
        total: base + bonus + baseBonus
      });
    }

    const fallbackSubtypeByName = new Map();
    for (const [groupKey, names] of Object.entries(SUMMONING_NAME_FALLBACKS)) {
      for (const name of names) {
        fallbackSubtypeByName.set(name.toLowerCase(), groupKey);
      }
    }

    const summoningGroups = Object.entries(SUMMONING_SUBTYPES).map(([key, label]) => ({
      key,
      label,
      skills: []
    }));
    const summoningGroupMap = Object.fromEntries(summoningGroups.map(group => [group.key, group]));
    const summoningSkills = skillsByType.summoning ?? [];
    for (const skill of summoningSkills) {
      const rawSubtype = skill.subtype ?? "";
      let subtypeKey = Object.prototype.hasOwnProperty.call(SUMMONING_SUBTYPES, rawSubtype)
        ? rawSubtype
        : "";
      if (!subtypeKey) {
        const nameKey = (skill.name ?? "").trim().toLowerCase();
        subtypeKey = fallbackSubtypeByName.get(nameKey) ?? "other";
      }
      const targetGroup = summoningGroupMap[subtypeKey] ?? summoningGroupMap.other;
      targetGroup.skills.push(skill);
    }

    const rawCraftSlotIds = Array.isArray(actorData.craftSlots) ? actorData.craftSlots : [];
    const craftSlotIds = Array.from({ length: 2 }, (_, index) => {
      const value = rawCraftSlotIds[index];
      return typeof value === "string" && value.trim().length ? value : null;
    });
    const craftSlotIdSet = new Set(craftSlotIds.filter(Boolean));
    const craftSlotMap = new Map();

    const knowSkills = skillsByType.know ?? [];
    const knowGeneral = [];
    const languageMap = new Map();
    for (const item of knowSkills) {
      if (craftSlotIdSet.has(item.id)) {
        craftSlotMap.set(item.id, item);
        continue;
      }

      const languageInfo = this._parseLanguageSkillName(item.name ?? "");
      if (!languageInfo) {
        knowGeneral.push(item);
        continue;
      }

      const key = languageInfo.key;
      if (!languageMap.has(key)) {
        languageMap.set(key, {
          key,
          name: languageInfo.label,
          speak: null,
          read: null
        });
      }

      const entry = languageMap.get(key);
      if (languageInfo.variant === "speak") entry.speak = item;
      else entry.read = item;
    }
    const knowLanguages = Array.from(languageMap.values())
      .sort((a, b) => collator.compare(a.name ?? "", b.name ?? ""));
    skillsByType.know = knowGeneral;

    knowLanguages.forEach(lang => {
      lang.speak ??= null;
      lang.read ??= null;
      lang.key = lang.key ?? (lang.name ?? "").toLowerCase();
    });
    this._languageCache = knowLanguages.map(lang => ({
      key: lang.key,
      name: lang.name,
      speak: lang.speak,
      read: lang.read
    }));
    this._languageCache = knowLanguages.map(lang => ({
      key: lang.key,
      name: lang.name,
      speak: lang.speak,
      read: lang.read
    }));

    const craftSlots = craftSlotIds.map((id, index) => {
      if (!id) return { index, id: null, item: null };

      if (!craftSlotMap.has(id)) {
        const doc = this.actor.items.get(id);
        if (doc?.type === "skill" && (doc.system?.type ?? "") === "know") {
          const base = Number(doc.system?.base ?? 0);
          const typeKey = doc.system?.type ?? "";
          const bonus = this._skillStartsAtZero(doc.name)
            ? 0
            : Number(skillBonuses[typeKey] ?? 0);
          const baseBonus = this._skillBaseOffset(doc.name);
          craftSlotMap.set(id, {
            id: doc.id,
            name: doc.name,
            type: typeKey,
            subtype: String(doc.system?.subtype ?? "").toLowerCase(),
            base,
            bonus,
            baseBonus,
            total: base + bonus + baseBonus
          });
        }
      }

      const item = craftSlotMap.get(id) ?? null;
      if (!item) return { index, id: null, item: null };
      return { index, id, item };
    });

    const combat = actorData.combat ?? {};
    combat.damageMods ??= {};
    combat.damageMods.hand ??= "";
    combat.damageMods.projectile ??= "";

    const attackBonus = Number(combat.attackBonus ?? 0);
    const parryBonus = Number(combat.parryBonus ?? 0);
    const weaponStats = actorData.weaponStats ?? {};

    const weaponRows = this.actor.items
      .filter(item => item.type === "weapon")
      .sort((a, b) => collator.compare(a.name ?? "", b.name ?? ""))
      .map(item => {
        const system = item.system ?? {};
        const stats = weaponStats[item.id] ?? {};
        const attackBase = Number(stats.attack ?? 0);
        const parryBase = Number(stats.parry ?? 0);
        const category = system.category === "projectile" ? "projectile" : "hand";
        const dmgMod = combat.damageMods?.[category] ?? "";
        const damageBase = system.damage ?? "";

        const damageDisplayParts = [];
        const damageFormulaParts = [];

        const addDamagePart = (part) => {
          const trimmed = (part ?? "").trim();
          if (!trimmed) return;
          damageDisplayParts.push(trimmed);
          const isFirst = damageFormulaParts.length === 0;
          if (isFirst) {
            damageFormulaParts.push(trimmed);
          } else if (/^[+-]/.test(trimmed)) {
            damageFormulaParts.push(trimmed);
          } else {
            damageFormulaParts.push(`+ ${trimmed}`);
          }
        };

        addDamagePart(damageBase);
        addDamagePart(dmgMod);

        const damageDisplay = damageDisplayParts.join(" ").trim();
        const damageFormula = damageFormulaParts.join(" ").trim().replace(/\s+/g, " ");

        const attackDisplay = attackBase + attackBonus;
        const parryDisplay = parryBase + parryBonus;
        return {
          id: item.id,
          name: item.name,
          system,
          attackBase,
          parryBase,
          attackDisplay,
          parryDisplay,
          damageDisplay,
          damageFormula,
          weaponCategory: category,
          isProjectile: category === "projectile"
        };
      });

  return {
      ...data,
      actor: this.actor,
      system: actorData,
      items: this.actor.items.contents,
      config: CONFIG.STORM ?? {},
      skillsByType,
      skillBonuses,
      craftSlots,
      weaponRows,
      knowLanguages,
      summoningGroups
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    console.log("StormActorSheet listeners activated for", this.actor.name);

  html.find("[data-action='roll-attr']").on("click", async ev => {
    const attr = ev.currentTarget.dataset.attr;
    const val = Number(this.actor.system.attributes[attr] ?? 10);
    const roll = await new Roll("1d100").evaluate({async: true});
    const { success, isCritical } = this._evaluateRoll(val, roll.total);
    const resultLabel = this._formatRollResult({ success, isCritical });
    const label = `${attr.toUpperCase()} Check (vs ${val})`;
    await this._sendD100RollMessage({
      roll,
      flavor: `${label} → ${resultLabel}`,
      label,
      target: val,
      resultLabel,
      allowPush: this.actor.type !== "creature" && !success
    });
  });

  // Handle skill rolls when clicking the skill name
  html.find("[data-action='roll-skill']").on("click", async ev => {
    const element = ev.currentTarget;
    const itemId = element.dataset.itemId;
    const skill = this.actor.items.get(itemId);
    if (!skill) return;

    const typeKey = skill.system?.type ?? "";
    const bonus = this._skillStartsAtZero(skill.name)
      ? 0
      : Number(this.actor.system?.skillBonuses?.[typeKey] ?? 0);
    const baseBonus = this._skillBaseOffset(skill.name);
    const target = Number(skill.system?.base ?? 0) + bonus + baseBonus;
    const roll = await new Roll("1d100").evaluate({async: true});
    const { success, isCritical } = this._evaluateRoll(target, roll.total);
    const resultLabel = this._formatRollResult({ success, isCritical });
    const label = `${skill.name} Check (vs ${target}%)`;
    await this._sendD100RollMessage({
      roll,
      flavor: `${label} → ${resultLabel}`,
      label,
      target,
      resultLabel,
      allowPush: this.actor.type !== "creature" && !success
    });
  });

  // Handle inline item field edits (e.g., skills)
  html.find(".item-field").change(ev => {
    const input = ev.currentTarget;
    const itemId = input.dataset.itemId;
    const field = input.dataset.field;
    const bonus = Number(input.dataset.bonus ?? 0);
    const baseBonus = Number(input.dataset.baseBonus ?? 0);
    const value = Number(input.value) - bonus - baseBonus;
    const item = this.actor.items.get(itemId);
    if (item) item.update({ [field]: value });
  });

  html.find(".craft-remove").on("click", async ev => {
    const button = ev.currentTarget;
    const index = Number(button.dataset.craftSlot ?? -1);
    if (!Number.isInteger(index) || index < 0) return;
    await this._assignCraftSlot(index, null);
  });

  html.find(".weapon-stat-input").change(ev => {
    const input = ev.currentTarget;
    const weaponId = input.dataset.weaponId;
    const stat = input.dataset.stat;
    if (!weaponId || !stat) return;
    const combat = this.actor.system?.combat ?? {};
    const bonus = stat === "attack"
      ? Number(combat.attackBonus ?? 0)
      : Number(combat.parryBonus ?? 0);
    const totalValue = Number(input.value) || 0;
    const baseValue = totalValue - bonus;
    const path = `system.weaponStats.${weaponId}.${stat}`;
    this.actor.update({ [path]: baseValue });
  });

  html.find(".weapon-roll").on("click", ev => this._rollWeapon(ev));
  html.find(".weapon-damage-roll").on("click", ev => this._rollWeaponDamage(ev));
  html.find(".weapon-row[data-item-id]").on("contextmenu", ev => this._onWeaponContextMenu(ev));
  html.find(".armor-protection-roll").on("click", ev => this._rollArmorProtection(ev));
  html.find(".armor-protection-input").on("input", ev => this._updateArmorRollButton(ev));
  html.find(".language-roll").on("click", ev => this._onLanguageRoll(ev));
  html.find(".creature-weapon-remove").on("click", ev => this._removeCreatureWeapon(ev));
  html.find(".skill-row[draggable='true']").on("dragstart", ev => this._onSkillDragStart(ev));
  }

  async _rollWeapon(event) {
    const button = event.currentTarget;
    const weaponId = button.dataset.weaponId;
    const rollType = button.dataset.rollType;
    if (!weaponId || !rollType) return;

    const weapon = this.actor.items.get(weaponId);
    const weaponName = weapon?.name ?? game.i18n.localize("storm.weapon");

    const stats = this.actor.system.weaponStats?.[weaponId] ?? {};
    const combat = this.actor.system.combat ?? {};
    const base = Number(stats[rollType] ?? 0);
    const bonusKey = rollType === "parry" ? "parryBonus" : "attackBonus";
    const bonus = Number(combat[bonusKey] ?? 0);
    const target = base + bonus;

    const roll = await new Roll("1d100").evaluate({async: true});
    const { success, isCritical } = this._evaluateRoll(target, roll.total);
    const resultLabel = this._formatRollResult({ success, isCritical });
    const label = `${weaponName} ${rollType === "parry" ? "Parry" : "Attack"} (${target}%)`;
    await this._sendD100RollMessage({
      roll,
      flavor: `${label} → ${resultLabel}`,
      label,
      target,
      resultLabel,
      allowPush: false
    });
  }

  async _rollWeaponDamage(event) {
    const button = event.currentTarget;
    const weaponId = button.dataset.weaponId;
    const formula = button.dataset.damageFormula;
    if (!weaponId || !formula) return;

    const weapon = this.actor.items.get(weaponId);
    const weaponName = weapon?.name ?? game.i18n.localize("storm.weapon");

    const roll = await new Roll(formula).evaluate({async: true});
    const flavor = `${weaponName} Damage (${formula})`;
    await this._sendDamageRollMessage({
      roll,
      flavor,
      label: flavor
    });
  }

  async _onWeaponContextMenu(event) {
    event.preventDefault();
    const row = event.currentTarget;
    const weaponId = row.dataset.itemId;
    if (!weaponId) return;
    const weapon = this.actor.items.get(weaponId);
    if (!weapon) return;

    await Dialog.confirm({
      title: "Delete Weapon",
      content: `<p>Are you sure you want to delete <strong>${weapon.name}</strong>?</p>`,
      yes: () => weapon.delete(),
      options: { jQuery: false }
    });
  }

  async _rollArmorProtection(event) {
    const button = event.currentTarget;
    event.preventDefault();
    if (button.disabled) return;
    const container = button.closest(".armor-inline");
    const nameInput = container?.querySelector(".armor-name-input");
    const formulaInput = container?.querySelector(".armor-protection-input");
    const formula = (formulaInput?.value ?? this.actor.system?.armour?.protection ?? "").trim();
    if (!formula) return;

    const armorName = (nameInput?.value ?? this.actor.system?.armour?.name ?? "Armor").trim() || "Armor";
    const roll = await new Roll(formula).evaluate({ async: true });
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `${armorName} Protection (${formula})`
    });
  }

  _updateArmorRollButton(event) {
    const input = event.currentTarget;
    const container = input.closest(".armor-inline");
    if (!container) return;
    const button = container.querySelector(".armor-protection-roll");
    if (!button) return;
    const formula = (input.value ?? "").trim();
    button.disabled = formula.length === 0;
  }

  _skillStartsAtZero(name) {
    const value = (name ?? "").toLowerCase();
    if (!value) return false;
    if (value.includes("poison lore")) return true;
    if (value.includes("plant lore")) return true;
    if (value.includes("music lore")) return true;
    if (value.startsWith("r/w") || value.includes("read/write")) return true;
    return false;
  }

  _skillBaseOffset(name) {
    const value = (name ?? "").toLowerCase();
    if (!value) return 0;
    const startsWithAny = (...parts) => parts.some(part => value === part || value.startsWith(part));
    if (startsWithAny("move quietly", "hide", "climb", "jump", "see", "listen", "balance", "persuade")) {
      return 10;
    }
    return 0;
  }

  _evaluateRoll(target, rollTotal) {
    return StormActorSheet.evaluateD100Roll(target, rollTotal);
  }

  _formatRollResult({ success, isCritical }) {
    return StormActorSheet.formatRollResult({ success, isCritical });
  }

  async _sendD100RollMessage(options) {
    return StormActorSheet.sendD100RollMessage({
      actor: this.actor,
      ...options
    });
  }

  async _sendDamageRollMessage(options) {
    return StormActorSheet.sendDamageRollMessage({
      actor: this.actor,
      ...options
    });
  }

  static evaluateD100Roll(target, rollTotal) {
    const success = rollTotal <= target;
    const critThreshold = Math.max(1, Math.floor(target / 10));
    const isCritical = success && rollTotal <= critThreshold;
    return { success, isCritical };
  }

  static formatRollResult({ success, isCritical }) {
    if (isCritical) return `<strong class="critical-success">Critical Success!</strong>`;
    return success ? `<span class="success-result">Success</span>` : "Failure";
  }

  static async sendD100RollMessage({
    actor,
    roll,
    flavor,
    label,
    target,
    resultLabel,
    allowPush = false,
    isPush = false,
    speaker
  }) {
    const speakerData = speaker ?? ChatMessage.getSpeaker({ actor });
    const parsedTarget = Number(target);
    const targetValue = Number.isFinite(parsedTarget) ? parsedTarget : 0;
    const totalRaw = Number.isFinite(roll.total) ? Number(roll.total) : 0;
    const total = Math.max(0, Math.min(100, Math.floor(totalRaw)));
    const normalized = ((total % 100) + 100) % 100;
    const isHundred = total === 100;
    const tensValue = isHundred ? 0 : Math.floor(normalized / 10) * 10;
    const unitsValue = isHundred ? 0 : normalized % 10;

    const templateData = {
      actorName: actor?.name ?? "",
      label,
      formula: roll.formula,
      totalDisplay: isHundred ? "100" : String(total).padStart(2, "0"),
      tensDisplay: isHundred ? "00" : String(tensValue).padStart(2, "0"),
      unitsDisplay: String(unitsValue),
      resultLabel,
      target: targetValue,
      allowPush: allowPush && !isPush,
      isPush
    };

    const content = await renderTemplate(
      "systems/stormbringer3e/templates/chat/d100-roll-card.hbs",
      templateData
    );

    const flags = {
      stormbringer3e: {
        canPush: allowPush && !isPush,
        isPush,
        pushData: allowPush && !isPush
          ? {
              actorId: actor?.id ?? null,
              target: targetValue,
              label,
              speaker: speakerData,
              used: false
            }
          : null
      }
    };

    return ChatMessage.create({
      speaker: speakerData,
      flavor,
      content,
      sound: CONFIG.sounds?.dice ?? null,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      rolls: [roll],
      flags
    });
  }

  static async sendDamageRollMessage({
    actor,
    roll,
    flavor,
    label,
    resultLabel,
    speaker
  }) {
    const speakerData = speaker ?? ChatMessage.getSpeaker({ actor });
    const templateData = StormActorSheet._buildDamageRollTemplateData(roll);
    templateData.formula = roll.formula;
    templateData.resultLabel = resultLabel ?? templateData.resultLabel ?? "";
    templateData.label = label ?? "";

    const content = await renderTemplate(
      "systems/stormbringer3e/templates/chat/damage-roll-card.hbs",
      templateData
    );

    return ChatMessage.create({
      speaker: speakerData,
      flavor,
      content,
      sound: CONFIG.sounds?.dice ?? null,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      rolls: [roll]
    });
  }

  static _buildDamageRollTemplateData(roll) {
    const entries = [];
    let diceSum = 0;

    const diceTerms = Array.isArray(roll?.dice) ? roll.dice : [];
    for (const die of diceTerms) {
      const faces = Number(die?.faces ?? 0);
      if (!Number.isFinite(faces) || faces <= 0) continue;
      const results = Array.isArray(die?.results)
        ? die.results.filter(result => result && result.discarded !== true && result.active !== false)
        : [];
      if (!results.length) continue;

      let index = 0;
      for (const result of results) {
        index += 1;
        const value = Number(result?.result ?? result);
        if (!Number.isFinite(value)) continue;
        diceSum += value;
        const dieLabel = die.number > 1 ? `d${faces} #${index}` : `d${faces}`;
        entries.push({
          label: dieLabel,
          value: StormActorSheet._formatDamageNumber(value)
        });
      }
    }

    const total = Number.isFinite(roll?.total) ? Number(roll.total) : 0;
    const remainder = total - diceSum;
    if (Math.abs(remainder) > 1e-6) {
      const formatted = StormActorSheet._formatDamageNumber(remainder);
      const signed = remainder > 0 ? `+${formatted}` : formatted;
      entries.push({
        label: "Modifier",
        value: signed
      });
    }

    if (!entries.length) {
      entries.push({
        label: "Value",
        value: StormActorSheet._formatDamageNumber(total)
      });
    }

    const totalDisplay = StormActorSheet._formatDamageNumber(total);
    const breakdown = typeof roll?.result === "string" ? roll.result : "";

    return {
      diceEntries: entries,
      totalDisplay,
      resultLabel: breakdown
    };
  }

  static _formatDamageNumber(value) {
    if (!Number.isFinite(value)) return "0";
    if (Math.abs(value - Math.round(value)) <= 1e-6) {
      return String(Math.round(value));
    }
    return Number(value).toFixed(2).replace(/\.?0+$/, "");
  }

  _parseLanguageSkillName(rawName) {
    if (!rawName) return null;
    const name = rawName.trim();
    const regex = /^(Speak|Read\/?Write|R\/W)\s*[\-:]?\s*(.+)$/i;
    const match = name.match(regex);
    if (!match) return null;
    const prefix = match[1].toLowerCase();
    const labelRaw = match[2].trim().replace(/^[()]/, "").replace(/[()]$/, "");
    const key = labelRaw.toLowerCase();
    const variant = prefix.startsWith("speak") ? "speak" : "read";
    return { key, label: labelRaw || name, variant };
  }

  async _onLanguageRoll(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const key = button.dataset.languageKey;
    if (!key) return;

    const languages = this._languageCache ?? this._buildLanguageCache();
    const language = languages.find(entry => entry.key === key);
    if (!language) return;

    const options = [];
    if (language.speak) options.push({ id: "speak", label: `Speak (${language.speak.total}%)`, data: language.speak });
    if (language.read) options.push({ id: "read", label: `R/W (${language.read.total}%)`, data: language.read });

    if (!options.length) return;

    const choice = options.length === 1 ? options[0] : await this._promptLanguageChoice(language.name, options);
    if (!choice) return;

    await this._rollLanguageSkill(choice.data, language.name, choice.id === "read" ? "R/W" : "Speak");
  }

  _buildLanguageCache() {
    if (this._languageCache) return this._languageCache;
    return [];
  }

  async _promptLanguageChoice(name, options) {
    return new Promise(resolve => {
      const buttons = options.map(opt => `<button type="button" data-choice="${opt.id}">${opt.label}</button>`).join(" ");
      const dlg = new Dialog({
        title: `${name} Check`,
        content: `<div class="language-choice">${buttons}</div>`,
        buttons: {},
        render: html => {
          html.find("button[data-choice]").on("click", ev => {
            const id = ev.currentTarget.dataset.choice;
            resolve(options.find(opt => opt.id === id));
            dlg.close();
          });
        },
        close: () => resolve(null)
      }, { jQuery: true });
      dlg.render(true);
    });
  }

  async _rollLanguageSkill(data, languageName, columnLabel) {
    const item = data?.item ?? this.actor.items.get(data?.id);
    if (!item) return;

    const typeKey = item.system?.type ?? "";
    const bonus = this._skillStartsAtZero(item.name)
      ? 0
      : Number(this.actor.system?.skillBonuses?.[typeKey] ?? 0);
    const baseBonus = this._skillBaseOffset(item.name);
    const target = Number(item.system?.base ?? 0) + bonus + baseBonus;

    const roll = await new Roll("1d100").evaluate({ async: true });
    const { success, isCritical } = this._evaluateRoll(target, roll.total);
    const resultLabel = this._formatRollResult({ success, isCritical });
    const label = `${languageName} (${columnLabel}) (${target}%)`;
    await this._sendD100RollMessage({
      roll,
      flavor: `${label} → ${resultLabel}`,
      label,
      target,
      resultLabel,
      allowPush: this.actor.type !== "creature" && !success
    });
  }

  _onSkillDragStart(event) {
    const dragEvent = event.originalEvent ?? event;
    const row = event.currentTarget;
    const itemId = row?.dataset?.itemId;
    if (!itemId || !dragEvent?.dataTransfer) return;
    const item = this.actor.items.get(itemId);
    if (!item?.toDragData) return;
    const dragData = item.toDragData();
    dragEvent.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    dragEvent.dataTransfer.effectAllowed = "copyMove";
  }

  async _onDrop(event) {
    const slotElement = event.target?.closest?.("[data-craft-slot]");
    if (slotElement) {
      event.preventDefault();
      const index = Number(slotElement.dataset.craftSlot ?? -1);
      if (!Number.isInteger(index) || index < 0) return;
      const data = await TextEditor.getDragEventData(event);
      await this._handleCraftDrop(data, index);
      return;
    }
    return super._onDrop(event);
  }

  async _handleCraftDrop(data, index) {
    if (!data || data.type !== "Item") return;

    let document;
    try {
      document = await CONFIG.Item.documentClass.fromDropData(data);
    } catch (error) {
      console.error("StormActorSheet | Failed to resolve dropped item", error);
      return;
    }

    if (!document) return;
    if (document.type !== "skill") {
      ui.notifications?.warn?.("Only skills can be assigned to Craft slots.");
      return;
    }

    const typeKey = document.system?.type ?? "";
    if (typeKey !== "know") {
      ui.notifications?.warn?.("Craft slots require Knowledge skills.");
      return;
    }

    let ownedItem = document.parent?.id === this.actor.id ? document : null;
    if (!ownedItem) {
      const source = document.toObject();
      delete source._id;
      const created = await this.actor.createEmbeddedDocuments("Item", [source]);
      ownedItem = Array.isArray(created) ? created[0] : null;
    }

    if (!ownedItem) return;
    await this._assignCraftSlot(index, ownedItem.id);
  }

  async _assignCraftSlot(index, itemId) {
    const current = Array.isArray(this.actor.system?.craftSlots) ? [...this.actor.system.craftSlots] : [];
    const normalized = Array.from({ length: 2 }, (_, i) => {
      const value = current[i];
      return typeof value === "string" && value.trim().length ? value : null;
    });

    const updates = {};
    if (itemId) {
      const duplicateIndex = normalized.findIndex(value => value === itemId);
      if (duplicateIndex !== -1 && duplicateIndex !== index) {
        updates[`system.craftSlots.${duplicateIndex}`] = null;
      }
      updates[`system.craftSlots.${index}`] = itemId;
    } else {
      updates[`system.craftSlots.${index}`] = null;
    }

    if (!Object.keys(updates).length) return;
    await this.actor.update(updates);
  }

  async _removeCreatureWeapon(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const index = Number(button.dataset.index);
    if (Number.isNaN(index)) return;

    const weapons = Array.isArray(this.actor.system?.creatureWeapons)
      ? [...this.actor.system.creatureWeapons]
      : [];
    weapons.splice(index, 1);
    await this.actor.update({ "system.creatureWeapons": weapons });
  }
}
