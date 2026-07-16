using Nightfall3.Actors;
using UnityEngine;
using UnityEngine.UI;

namespace Nightfall3.UI
{
    public sealed class DemoHud : MonoBehaviour
    {
        private Image healthFill;
        private PlayerController player;
        private RectTransform safeAreaRoot;
        private Rect lastSafeArea;
        private readonly Image[] cooldownMasks = new Image[4];
        private readonly Text[] cooldownLabels = new Text[4];
        private Text objectiveProgress;
        private float nextObjectiveRefresh;

        public static DemoHud Create(PlayerController target)
        {
            var root = new GameObject("Demo HUD", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster), typeof(DemoHud));
            var canvas = root.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 100;
            var scaler = root.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(844f, 390f);
            scaler.matchWidthOrHeight = 0.65f;

            var hud = root.GetComponent<DemoHud>();
            hud.player = target;
            hud.Build();
            return hud;
        }

        private void Build()
        {
            safeAreaRoot = new GameObject("Safe Area", typeof(RectTransform)).GetComponent<RectTransform>();
            safeAreaRoot.SetParent(transform, false);
            safeAreaRoot.offsetMin = safeAreaRoot.offsetMax = Vector2.zero;
            ApplySafeArea();

            BuildVitals();
            BuildObjective();
            BuildActionBar();
            BuildTouchStick();
        }

        private void BuildVitals()
        {
            var plate = CreateImage("Hero Plate", safeAreaRoot, new Vector2(18f, -14f), new Vector2(218f, 62f), new Color(0.82f, 0.76f, 0.62f, 0.96f), new Vector2(0f, 1f), "Art/UI/panel", false);
            CreateText("DUSKWEAVER", plate.transform, new Vector2(62f, -10f), new Vector2(142f, 20f), 15, new Color(0.96f, 0.81f, 0.47f), new Vector2(0f, 1f));
            CreateText("ASHEN COVENANT  I", plate.transform, new Vector2(62f, -32f), new Vector2(142f, 18f), 11, new Color(0.68f, 0.72f, 0.76f), new Vector2(0f, 1f));

            CreateImage("Blood Orb", plate.transform, new Vector2(6f, -5f), new Vector2(52f, 52f), Color.white, new Vector2(0f, 1f), "Art/UI/hp_orb");
            var track = CreateImage("Health Track", plate.transform, new Vector2(62f, -51f), new Vector2(140f, 5f), new Color(0.08f, 0.008f, 0.008f, 1f), new Vector2(0f, 1f));
            healthFill = CreateImage("Health", track.transform, Vector2.zero, new Vector2(140f, 5f), new Color(0.82f, 0.045f, 0.025f, 1f), new Vector2(0f, 1f));
            healthFill.type = Image.Type.Filled;
            healthFill.fillMethod = Image.FillMethod.Horizontal;
        }

        private void BuildObjective()
        {
            var region = CreateImage("Region", safeAreaRoot, new Vector2(0f, -11f), new Vector2(250f, 40f), new Color(0.72f, 0.67f, 0.56f, 0.86f), new Vector2(0.5f, 1f), "Art/UI/panel", false);
            CreateText("ASHEN APPROACH", region.transform, new Vector2(0f, -7f), new Vector2(226f, 22f), 16, new Color(0.98f, 0.83f, 0.48f), new Vector2(0.5f, 1f), TextAnchor.UpperCenter);

            var quest = CreateImage("Quest", safeAreaRoot, new Vector2(-18f, -14f), new Vector2(228f, 58f), new Color(0.75f, 0.7f, 0.59f, 0.9f), new Vector2(1f, 1f), "Art/UI/panel", false);
            CreateText("BLOODBOUND AT THE GATE", quest.transform, new Vector2(12f, -9f), new Vector2(202f, 19f), 13, new Color(0.96f, 0.79f, 0.43f), new Vector2(0f, 1f));
            objectiveProgress = CreateText("Pack  0 / 4     Gate sealed", quest.transform, new Vector2(12f, -31f), new Vector2(202f, 18f), 11, new Color(0.78f, 0.78f, 0.74f), new Vector2(0f, 1f));
        }

        private void BuildActionBar()
        {
            var bar = CreateImage("Action Bar", safeAreaRoot, new Vector2(0f, 8f), new Vector2(320f, 75f), new Color(0.78f, 0.72f, 0.6f, 0.98f), new Vector2(0.5f, 0f), "Art/UI/panel", false);
            CreateImage("Blood Orb", safeAreaRoot, new Vector2(-214f, 5f), new Vector2(92f, 92f), Color.white, new Vector2(0.5f, 0f), "Art/UI/hp_orb");
            CreateImage("Aether Orb", safeAreaRoot, new Vector2(122f, 5f), new Vector2(92f, 92f), Color.white, new Vector2(0.5f, 0f), "Art/UI/mana_orb");

            var icons = new[]
            {
                "Art/Icons/skill-chain-lightning",
                "Art/Icons/skill-static-field",
                "Art/Icons/skill-teleport",
                "Art/Icons/skill-frozen-orb"
            };
            for (var i = 0; i < icons.Length; i++)
            {
                var slot = CreateImage($"Skill {i + 1}", bar.transform, new Vector2(16f + i * 74f, -9f), new Vector2(58f, 58f), Color.white, new Vector2(0f, 1f), "Art/UI/item_slot");
                var icon = CreateImage("Icon", slot.transform, new Vector2(5f, -5f), new Vector2(48f, 48f), new Color(0.73f, 0.78f, 0.86f, 0.94f), new Vector2(0f, 1f), icons[i]);
                CreateText((i + 1).ToString(), slot.transform, new Vector2(40f, -37f), new Vector2(14f, 16f), 10, new Color(0.95f, 0.8f, 0.45f), new Vector2(0f, 1f), TextAnchor.MiddleCenter);
                var button = icon.gameObject.AddComponent<Button>();
                button.targetGraphic = icon;
                var skill = i;
                button.onClick.AddListener(() => CastSkill(skill));
                cooldownMasks[i] = CreateImage("Cooldown", icon.transform, Vector2.zero, new Vector2(48f, 48f), new Color(0.015f, 0.02f, 0.035f, 0.76f), new Vector2(0f, 1f));
                cooldownMasks[i].type = Image.Type.Filled;
                cooldownMasks[i].fillMethod = Image.FillMethod.Radial360;
                cooldownMasks[i].fillOrigin = (int)Image.Origin360.Top;
                cooldownMasks[i].fillClockwise = false;
                cooldownMasks[i].raycastTarget = false;
                cooldownLabels[i] = CreateText(string.Empty, icon.transform, Vector2.zero, new Vector2(48f, 48f), 17, Color.white, new Vector2(0f, 1f), TextAnchor.MiddleCenter);
            }
        }

        private void BuildTouchStick()
        {
            var ring = CreateImage("Movement Ring", safeAreaRoot, new Vector2(28f, 22f), new Vector2(82f, 82f), new Color(0.6f, 0.62f, 0.64f, 0.22f), new Vector2(0f, 0f), "Art/UI/btn_frame");
            CreateImage("Movement Core", ring.transform, new Vector2(22f, -22f), new Vector2(38f, 38f), new Color(0.64f, 0.72f, 0.78f, 0.34f), new Vector2(0f, 1f), "Art/UI/btn_frame");
        }

        private void Update()
        {
            if (Screen.safeArea != lastSafeArea) ApplySafeArea();
            if (player == null || healthFill == null) return;
            healthFill.fillAmount = player.Health.Current / player.Health.Maximum;
            if (Time.unscaledTime >= nextObjectiveRefresh)
            {
                var remainingEnemies = FindObjectsByType<EnemyController>(FindObjectsSortMode.None).Length;
                objectiveProgress.text = remainingEnemies > 0 ? $"Pack  {4 - remainingEnemies} / 4     Gate sealed" : "Pack broken     Gate unbound";
                nextObjectiveRefresh = Time.unscaledTime + 0.2f;
            }
            for (var i = 0; i < cooldownMasks.Length; i++)
            {
                var remaining = player.GetCooldownNormalized(i);
                cooldownMasks[i].fillAmount = remaining;
                cooldownLabels[i].text = remaining > 0f ? Mathf.CeilToInt(remaining * CooldownDuration(i)).ToString() : string.Empty;
            }
        }

        private void CastSkill(int skill)
        {
            switch (skill)
            {
                case 0: player.CastArcBurst(); break;
                case 1: player.CastStaticField(); break;
                case 2: player.CastTeleport(); break;
                case 3: player.CastFrozenOrb(); break;
            }
        }

        private static float CooldownDuration(int skill) => skill switch
        {
            0 => Nightfall3.Combat.CombatTuning.ChainLightningCooldown,
            1 => Nightfall3.Combat.CombatTuning.StaticFieldCooldown,
            2 => Nightfall3.Combat.CombatTuning.TeleportCooldown,
            3 => Nightfall3.Combat.CombatTuning.FrozenOrbCooldown,
            _ => 1f
        };

        private void ApplySafeArea()
        {
            if (safeAreaRoot == null || Screen.width <= 0 || Screen.height <= 0) return;
            lastSafeArea = Screen.safeArea;
            safeAreaRoot.anchorMin = new Vector2(lastSafeArea.xMin / Screen.width, lastSafeArea.yMin / Screen.height);
            safeAreaRoot.anchorMax = new Vector2(lastSafeArea.xMax / Screen.width, lastSafeArea.yMax / Screen.height);
        }

        private static Image CreateImage(string name, Transform parent, Vector2 position, Vector2 size, Color color, Vector2 anchor, string resource = null, bool preserveAspect = true)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(CanvasRenderer), typeof(Image));
            go.transform.SetParent(parent, false);
            var rect = (RectTransform)go.transform;
            rect.anchorMin = rect.anchorMax = anchor;
            rect.pivot = anchor;
            rect.anchoredPosition = position;
            rect.sizeDelta = size;
            var image = go.GetComponent<Image>();
            image.color = color;
            if (!string.IsNullOrEmpty(resource)) image.sprite = LoadSprite(resource);
            image.preserveAspect = preserveAspect;
            return image;
        }

        private static Sprite LoadSprite(string resource)
        {
            var texture = Resources.Load<Texture2D>(resource);
            return texture == null ? null : Sprite.Create(texture, new Rect(0f, 0f, texture.width, texture.height), new Vector2(0.5f, 0.5f), 100f);
        }

        private static Text CreateText(string value, Transform parent, Vector2 position, Vector2 size, int fontSize, Color color, Vector2 anchor, TextAnchor alignment = TextAnchor.UpperLeft)
        {
            var go = new GameObject(value, typeof(RectTransform), typeof(CanvasRenderer), typeof(Text), typeof(Outline));
            go.transform.SetParent(parent, false);
            var rect = (RectTransform)go.transform;
            rect.anchorMin = rect.anchorMax = anchor;
            rect.pivot = anchor;
            rect.anchoredPosition = position;
            rect.sizeDelta = size;
            var text = go.GetComponent<Text>();
            text.text = value;
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = fontSize;
            text.color = color;
            text.alignment = alignment;
            text.raycastTarget = false;
            var outline = go.GetComponent<Outline>();
            outline.effectColor = new Color(0f, 0f, 0f, 0.88f);
            outline.effectDistance = new Vector2(1f, -1f);
            return text;
        }
    }
}
