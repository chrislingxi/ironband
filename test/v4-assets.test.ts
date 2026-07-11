import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const REQUIRED_ASSETS = [
  'art_source/v4/tiles/wilderness_source.png',
  'art_source/v4/tiles/town_source.png',
  'art_source/v4/tiles/desert_source.png',
  'art_source/v4/tiles/hell_source.png',
  'art_source/v4/tiles/snow_source.png',
  'assets/tile/wilderness.png',
  'assets/tile/town.png',
  'assets/tile/desert.png',
  'assets/tile/hell.png',
  'assets/tile/snow.png',
  'public/assets/tile/wilderness.png',
  'public/assets/tile/town.png',
  'public/assets/tile/desert.png',
  'public/assets/tile/hell.png',
  'public/assets/tile/snow.png',
  'assets/ui/title-bg.png',
  'public/assets/ui/title-bg.png',
  'assets/icon/skill-magic-arrow.svg',
  'assets/icon/skill-multiple-arrow.svg',
  'assets/icon/skill-frost-arrow.svg',
  'assets/icon/skill-ice-arrow.svg',
  'assets/icon/skill-exploding-arrow.svg',
  'public/assets/icon/skill-magic-arrow.svg',
  'public/assets/icon/skill-multiple-arrow.svg',
  'public/assets/icon/skill-frost-arrow.svg',
  'public/assets/icon/skill-ice-arrow.svg',
  'public/assets/icon/skill-exploding-arrow.svg',
  'assets/icon/skill-magic-arrow.png',
  'assets/icon/skill-multiple-arrow.png',
  'assets/icon/skill-frost-arrow.png',
  'assets/icon/skill-fire-arrow.png',
  'assets/icon/skill-exploding-arrow.png',
  'assets/icon/skill-ice-arrow.png',
  'assets/icon/skill-guided-arrow.png',
  'assets/icon/skill-strafe.png',
  'assets/icon/skill-valkyrie.png',
  'assets/icon/skill-bash.png',
  'assets/icon/skill-double-swing.png',
  'assets/icon/skill-stun.png',
  'assets/icon/skill-double-throw.png',
  'assets/icon/skill-concentrate.png',
  'assets/icon/skill-frenzy.png',
  'assets/icon/skill-whirlwind.png',
  'assets/icon/skill-berserk.png',
  'assets/icon/skill-sword-mastery.png',
  'assets/icon/skill-axe-mastery.png',
  'assets/icon/skill-mace-mastery.png',
  'assets/icon/skill-increased-stamina.png',
  'assets/icon/skill-increased-speed.png',
  'assets/icon/skill-iron-skin.png',
  'assets/icon/skill-natural-resistance.png',
  'assets/icon/skill-weapon-block.png',
  'assets/icon/skill-howl.png',
  'assets/icon/skill-shout.png',
  'assets/icon/skill-taunt.png',
  'assets/icon/skill-battle-cry.png',
  'assets/icon/skill-battle-orders.png',
  'assets/icon/skill-war-cry.png',
  'assets/icon/skill-battle-command.png',
  'assets/icon/skill-ice-bolt.png',
  'assets/icon/skill-frozen-armor.png',
  'assets/icon/skill-ice-blast.png',
  'assets/icon/skill-frost-nova.png',
  'assets/icon/skill-glacial-spike.png',
  'assets/icon/skill-blizzard.png',
  'assets/icon/skill-frozen-orb.png',
  'assets/icon/skill-fire-bolt.png',
  'assets/icon/skill-warmth.png',
  'assets/icon/skill-inferno.png',
  'assets/icon/skill-fire-ball.png',
  'assets/icon/skill-meteor.png',
  'assets/icon/skill-charged-bolt.png',
  'assets/icon/skill-static-field.png',
  'assets/icon/skill-telekinesis.png',
  'public/assets/icon/skill-magic-arrow.png',
  'public/assets/icon/skill-multiple-arrow.png',
  'public/assets/icon/skill-frost-arrow.png',
  'public/assets/icon/skill-fire-arrow.png',
  'public/assets/icon/skill-exploding-arrow.png',
  'public/assets/icon/skill-ice-arrow.png',
  'public/assets/icon/skill-guided-arrow.png',
  'public/assets/icon/skill-strafe.png',
  'public/assets/icon/skill-valkyrie.png',
  'public/assets/icon/skill-bash.png',
  'public/assets/icon/skill-double-swing.png',
  'public/assets/icon/skill-stun.png',
  'public/assets/icon/skill-double-throw.png',
  'public/assets/icon/skill-concentrate.png',
  'public/assets/icon/skill-frenzy.png',
  'public/assets/icon/skill-whirlwind.png',
  'public/assets/icon/skill-berserk.png',
  'public/assets/icon/skill-sword-mastery.png',
  'public/assets/icon/skill-axe-mastery.png',
  'public/assets/icon/skill-mace-mastery.png',
  'public/assets/icon/skill-increased-stamina.png',
  'public/assets/icon/skill-increased-speed.png',
  'public/assets/icon/skill-iron-skin.png',
  'public/assets/icon/skill-natural-resistance.png',
  'public/assets/icon/skill-weapon-block.png',
  'public/assets/icon/skill-howl.png',
  'public/assets/icon/skill-shout.png',
  'public/assets/icon/skill-taunt.png',
  'public/assets/icon/skill-battle-cry.png',
  'public/assets/icon/skill-battle-orders.png',
  'public/assets/icon/skill-war-cry.png',
  'public/assets/icon/skill-battle-command.png',
  'public/assets/icon/skill-ice-bolt.png',
  'public/assets/icon/skill-frozen-armor.png',
  'public/assets/icon/skill-ice-blast.png',
  'public/assets/icon/skill-frost-nova.png',
  'public/assets/icon/skill-glacial-spike.png',
  'public/assets/icon/skill-blizzard.png',
  'public/assets/icon/skill-frozen-orb.png',
  'public/assets/icon/skill-fire-bolt.png',
  'public/assets/icon/skill-warmth.png',
  'public/assets/icon/skill-inferno.png',
  'public/assets/icon/skill-fire-ball.png',
  'public/assets/icon/skill-meteor.png',
  'public/assets/icon/skill-charged-bolt.png',
  'public/assets/icon/skill-static-field.png',
  'public/assets/icon/skill-telekinesis.png',
  'assets/char/amazon.png',
  'assets/char/amazon_attack.png',
  'assets/char/barbarian_attack.png',
  'assets/char/sorceress_attack.png',
  'assets/char/barbarian.png',
  'assets/char/sorceress.png',
  'public/assets/char/amazon.png',
  'public/assets/char/amazon_attack.png',
  'public/assets/char/barbarian_attack.png',
  'public/assets/char/sorceress_attack.png',
  'public/assets/char/barbarian.png',
  'public/assets/char/sorceress.png',
  'art_source/v4/char/amazon_attack_source.png',
  'art_source/v4/char/barbarian_attack_source.png',
  'art_source/v4/char/sorceress_attack_source.png',
  'art_source/v4/runtime/amazon_portrait_source.png',
  'art_source/v4/runtime/barbarian_portrait_source.png',
  'art_source/v4/runtime/sorceress_portrait_source.png',
  'art_source/v4/runtime/mephisto_source.png',
  'art_source/v4/runtime/diablo_source.png',
  'art_source/v4/runtime/baal_source.png',
  'art_source/v4/runtime/campfire_source.png',
  'art_source/v4/runtime/exit_gate_source.png',
  'art_source/v4/runtime/blacksmith_anvil_source.png',
  'assets/prop/campfire.png',
  'assets/prop/exit_gate.png',
  'assets/prop/blacksmith_anvil.png',
  'public/assets/prop/campfire.png',
  'public/assets/prop/exit_gate.png',
  'public/assets/prop/blacksmith_anvil.png',
  'art_source/v4/props/ritual_altar_source.png',
  'assets/prop/ritual_altar.png',
  'public/assets/prop/ritual_altar.png',
  'assets/mon/mephisto.png',
  'assets/mon/diablo.png',
  'assets/mon/baal.png',
  'assets/mon/fallen.png',
  'assets/mon/zombie.png',
  'assets/mon/skeleton.png',
  'assets/mon/shaman.png',
  'assets/mon/archer.png',
  'assets/mon/brute.png',
  'assets/mon/hound.png',
  'assets/mon/spitter.png',
  'public/assets/mon/mephisto.png',
  'public/assets/mon/diablo.png',
  'public/assets/mon/baal.png',
  'public/assets/mon/fallen.png',
  'public/assets/mon/zombie.png',
  'public/assets/mon/skeleton.png',
  'public/assets/mon/shaman.png',
  'public/assets/mon/archer.png',
  'public/assets/mon/brute.png',
  'public/assets/mon/hound.png',
  'public/assets/mon/spitter.png',
  'assets/npc/akara.png',
  'assets/npc/kashya.png',
  'assets/npc/charsi.png',
  'assets/npc/gheed.png',
  'assets/npc/warriv.png',
  'assets/npc/cain.png',
  'public/assets/npc/akara.png',
  'public/assets/npc/kashya.png',
  'public/assets/npc/charsi.png',
  'public/assets/npc/gheed.png',
  'public/assets/npc/warriv.png',
  'public/assets/npc/cain.png',
  'assets/icon/skill-chain-lightning.png',
  'public/assets/icon/skill-chain-lightning.png',
  'assets/icon/skill-charged-strike.png',
  'public/assets/icon/skill-charged-strike.png',
  'assets/icon/skill-critical-strike.png',
  'public/assets/icon/skill-critical-strike.png',
  'assets/icon/skill-dodge.png',
  'public/assets/icon/skill-dodge.png',
  'assets/icon/skill-enchant.png',
  'public/assets/icon/skill-enchant.png',
  'assets/icon/skill-evade.png',
  'public/assets/icon/skill-evade.png',
  'assets/icon/skill-fire-wall.png',
  'public/assets/icon/skill-fire-wall.png',
  'assets/icon/skill-inner-sight.png',
  'public/assets/icon/skill-inner-sight.png',
  'assets/icon/skill-jab.png',
  'public/assets/icon/skill-jab.png',
  'assets/icon/skill-lightning-bolt.png',
  'public/assets/icon/skill-lightning-bolt.png',
  'assets/icon/skill-lightning-fury.png',
  'public/assets/icon/skill-lightning-fury.png',
  'assets/icon/skill-lightning.png',
  'public/assets/icon/skill-lightning.png',
  'assets/icon/skill-nova.png',
  'public/assets/icon/skill-nova.png',
  'assets/icon/skill-penetrate.png',
  'public/assets/icon/skill-penetrate.png',
  'assets/icon/skill-plague-javelin.png',
  'public/assets/icon/skill-plague-javelin.png',
  'assets/icon/skill-poison-javelin.png',
  'public/assets/icon/skill-poison-javelin.png',
  'assets/icon/skill-power-strike.png',
  'public/assets/icon/skill-power-strike.png',
  'assets/icon/skill-slow-missiles.png',
  'public/assets/icon/skill-slow-missiles.png',
  'assets/icon/skill-teleport.png',
  'public/assets/icon/skill-teleport.png',
  'assets/icon/skill-thunder-storm.png',
  'public/assets/icon/skill-thunder-storm.png',
  'art_source/v4/icons/service/service_forge_source.png',
  'art_source/v4/icons/service/service_shop_source.png',
  'art_source/v4/icons/service/service_heal_source.png',
  'art_source/v4/icons/service/service_identify_source.png',
  'assets/icon/service_forge.png',
  'assets/icon/service_shop.png',
  'assets/icon/service_heal.png',
  'assets/icon/service_identify.png',
  'public/assets/icon/service_forge.png',
  'public/assets/icon/service_shop.png',
  'public/assets/icon/service_heal.png',
  'public/assets/icon/service_identify.png',
  'assets/ui/item_slot.png',
  'assets/ui/item_slot_equipped.png',
  'assets/ui/rarity_common.png',
  'assets/ui/rarity_magic.png',
  'assets/ui/rarity_rare.png',
  'assets/ui/rarity_unique.png',
  'assets/ui/cooldown_mask.png',
  'public/assets/ui/item_slot.png',
  'public/assets/ui/item_slot_equipped.png',
  'public/assets/ui/rarity_common.png',
  'public/assets/ui/rarity_magic.png',
  'public/assets/ui/rarity_rare.png',
  'public/assets/ui/rarity_unique.png',
  'public/assets/ui/cooldown_mask.png',
  'assets/icon/status_burn.png',
  'assets/icon/status_freeze.png',
  'assets/icon/status_poison.png',
  'assets/icon/status_bleed.png',
  'public/assets/icon/status_burn.png',
  'public/assets/icon/status_freeze.png',
  'public/assets/icon/status_poison.png',
  'public/assets/icon/status_bleed.png',
  'art_source/v4/items/short_bow_source.png',
  'art_source/v4/items/cap_source.png',
  'art_source/v4/items/buckler_source.png',
  'art_source/v4/items/club_source.png',
  'art_source/v4/items/sash_source.png',
  'art_source/v4/items/ring_source.png',
  'assets/item/short_bow.png',
  'assets/item/cap.png',
  'assets/item/buckler.png',
  'assets/item/club.png',
  'assets/item/sash.png',
  'assets/item/ring.png',
  'public/assets/item/short_bow.png',
  'public/assets/item/cap.png',
  'public/assets/item/buckler.png',
  'public/assets/item/club.png',
  'public/assets/item/sash.png',
  'public/assets/item/ring.png',
  'art_source/v4/items/hand_axe_source.png',
  'art_source/v4/items/short_sword_source.png',
  'art_source/v4/items/mace_source.png',
  'art_source/v4/items/double_axe_source.png',
  'art_source/v4/items/skull_cap_source.png',
  'art_source/v4/items/small_shield_source.png',
  'assets/item/hand_axe.png',
  'assets/item/short_sword.png',
  'assets/item/mace.png',
  'assets/item/double_axe.png',
  'assets/item/skull_cap.png',
  'assets/item/small_shield.png',
  'public/assets/item/hand_axe.png',
  'public/assets/item/short_sword.png',
  'public/assets/item/mace.png',
  'public/assets/item/double_axe.png',
  'public/assets/item/skull_cap.png',
  'public/assets/item/small_shield.png',
];

describe('V4 visual asset pack', () => {
  it('keeps key V4 assets available for dev and GitHub Pages', () => {
    for (const file of REQUIRED_ASSETS) {
      expect(existsSync(file), `${file} should exist`).toBe(true);
      expect(statSync(file).size, `${file} should not be empty`).toBeGreaterThan(512);
    }
  });

  it('keeps painted isometric tiles mirrored at the runtime and Pages paths', () => {
    for (const name of ['wilderness', 'town', 'desert', 'hell', 'snow']) {
      const dev = readFileSync(`assets/tile/${name}.png`);
      const pages = readFileSync(`public/assets/tile/${name}.png`);
      expect(dev.equals(pages), `${name} tile copies should be identical`).toBe(true);
      expect(dev.readUInt32BE(16), `${name} tile width`).toBe(256);
      expect(dev.readUInt32BE(20), `${name} tile height`).toBe(128);
      expect(dev[25], `${name} tile should be RGBA`).toBe(6);
    }
  });

  it('keeps the Amazon bow attack pose mirrored and alpha-enabled', () => {
    const dev = readFileSync('assets/char/amazon_attack.png');
    const pages = readFileSync('public/assets/char/amazon_attack.png');
    expect(dev.equals(pages)).toBe(true);
    expect(dev.readUInt32BE(16)).toBe(512);
    expect(dev.readUInt32BE(20)).toBe(768);
    expect(dev[25]).toBe(6);
  });

  it('keeps every class attack pose mirrored and alpha-enabled', () => {
    for (const cls of ['amazon', 'barbarian', 'sorceress']) {
      const dev = readFileSync(`assets/char/${cls}_attack.png`);
      const pages = readFileSync(`public/assets/char/${cls}_attack.png`);
      expect(dev.equals(pages), `${cls} attack copies should be identical`).toBe(true);
      expect(dev.readUInt32BE(16), `${cls} attack width`).toBe(512);
      expect(dev.readUInt32BE(20), `${cls} attack height`).toBe(768);
      expect(dev[25], `${cls} attack should be RGBA`).toBe(6);
    }
  });

  it('keeps town service icons mirrored, square and alpha-enabled', () => {
    for (const name of ['forge', 'shop', 'heal', 'identify']) {
      const dev = readFileSync(`assets/icon/service_${name}.png`);
      const pages = readFileSync(`public/assets/icon/service_${name}.png`);
      expect(dev.equals(pages), `${name} service icon copies should be identical`).toBe(true);
      expect(dev.readUInt32BE(16), `${name} service icon width`).toBe(256);
      expect(dev.readUInt32BE(20), `${name} service icon height`).toBe(256);
      expect(dev[25], `${name} service icon should be RGBA`).toBe(6);
    }
  });

  it('keeps delivered item icons mirrored, square and alpha-enabled', () => {
    for (const name of ['short_bow', 'cap', 'buckler', 'club', 'sash', 'ring', 'hand_axe', 'short_sword', 'mace', 'double_axe', 'skull_cap', 'small_shield']) {
      const dev = readFileSync(`assets/item/${name}.png`);
      const pages = readFileSync(`public/assets/item/${name}.png`);
      expect(dev.equals(pages), `${name} item icon copies should be identical`).toBe(true);
      expect(dev.readUInt32BE(16), `${name} item icon width`).toBe(256);
      expect(dev.readUInt32BE(20), `${name} item icon height`).toBe(256);
      expect(dev[25], `${name} item icon should be RGBA`).toBe(6);
    }
  });

  it('keeps the V4 UI kit mirrored, correctly sized and alpha-enabled', () => {
    const ui128 = ['item_slot', 'item_slot_equipped', 'rarity_common', 'rarity_magic', 'rarity_rare', 'rarity_unique'];
    for (const name of ui128) {
      const dev = readFileSync(`assets/ui/${name}.png`);
      const pages = readFileSync(`public/assets/ui/${name}.png`);
      expect(dev.equals(pages), `${name} UI copies should be identical`).toBe(true);
      expect(dev.readUInt32BE(16)).toBe(128);
      expect(dev.readUInt32BE(20)).toBe(128);
      expect(dev[25]).toBe(6);
    }
    const cooldown = readFileSync('assets/ui/cooldown_mask.png');
    expect(cooldown.equals(readFileSync('public/assets/ui/cooldown_mask.png'))).toBe(true);
    expect(cooldown.readUInt32BE(16)).toBe(256);
    expect(cooldown.readUInt32BE(20)).toBe(256);
    for (const name of ['burn', 'freeze', 'poison', 'bleed']) {
      const dev = readFileSync(`assets/icon/status_${name}.png`);
      expect(dev.equals(readFileSync(`public/assets/icon/status_${name}.png`))).toBe(true);
      expect(dev.readUInt32BE(16)).toBe(128);
      expect(dev.readUInt32BE(20)).toBe(128);
      expect(dev[25]).toBe(6);
    }
  });

  it('keeps large runtime art inside the mobile delivery budget', () => {
    const groups = {
      char: ['amazon', 'barbarian', 'sorceress'],
      mon: ['mephisto', 'diablo', 'baal'],
      prop: ['campfire', 'exit_gate', 'blacksmith_anvil'],
    };
    for (const [category, names] of Object.entries(groups)) {
      for (const name of names) {
        const dev = readFileSync(`assets/${category}/${name}.png`);
        const pages = readFileSync(`public/assets/${category}/${name}.png`);
        expect(dev.equals(pages), `${category}/${name} copies should be identical`).toBe(true);
        expect(Math.max(dev.readUInt32BE(16), dev.readUInt32BE(20)), `${category}/${name} longest edge`).toBeLessThanOrEqual(768);
      }
    }
    const bytes = (dir: string): number => readdirSync(dir, { withFileTypes: true }).reduce((sum: number, entry) => {
      const path = `${dir}/${entry.name}`;
      return sum + (entry.isDirectory() ? bytes(path) : statSync(path).size);
    }, 0);
    expect(bytes('public/assets'), 'Pages runtime asset pack should stay below 38 MiB').toBeLessThan(38 * 1024 * 1024);
  });

  it('keeps the original Boss altar mirrored and alpha-enabled', () => {
    const dev = readFileSync('assets/prop/ritual_altar.png');
    expect(dev.equals(readFileSync('public/assets/prop/ritual_altar.png'))).toBe(true);
    expect(dev.readUInt32BE(16)).toBe(512);
    expect(dev.readUInt32BE(20)).toBe(512);
    expect(dev[25]).toBe(6);
  });
});
