using Nightfall3.Actors;
using Nightfall3.Flow;
using UnityEngine;
using UnityEngine.UI;

namespace Nightfall3.UI
{
    public sealed class DemoHud : MonoBehaviour
    {
        private Image healthFill;
        private PlayerController player;
        private DemoFlowController flow;
        private RectTransform safeAreaRoot;
        private Rect lastSafeArea;
        private readonly Image[] cooldownMasks = new Image[4];
        private readonly Text[] cooldownLabels = new Text[4];
        private Text objectiveProgress;
        private Text objectiveTitle;
        private Text regionTitle;
        private GameObject contextAction;
        private Text contextActionLabel;
        private GameObject bossPanel;
        private Image bossHealthFill;
        private Text bossPhase;
        private Text heroName;
        private Text heroPower;
        private RectTransform movementCore;
        private float nextObjectiveRefresh;

        public static DemoHud Create(PlayerController target, DemoFlowController demoFlow)
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
            hud.flow = demoFlow;
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
            BuildBossBar();
            BuildActionBar();
            BuildTouchStick();
            BuildContextAction();
        }

        private void BuildVitals()
        {
            var plate = CreateImage("Hero Plate", safeAreaRoot, new Vector2(18f, -14f), new Vector2(218f, 62f), new Color(0.82f, 0.76f, 0.62f, 0.96f), new Vector2(0f, 1f), "Art/UI/panel-v2", false);
            heroName = CreateText("DUSKWEAVER  LV 1", plate.transform, new Vector2(62f, -10f), new Vector2(142f, 20f), 13, new Color(0.96f, 0.81f, 0.47f), new Vector2(0f, 1f));
            heroPower = CreateText("SPELL POWER  1.00", plate.transform, new Vector2(62f, -32f), new Vector2(142f, 18f), 11, new Color(0.68f, 0.72f, 0.76f), new Vector2(0f, 1f));

            CreateImage("Hero Portrait", plate.transform, new Vector2(6f, -5f), new Vector2(52f, 52f), Color.white, new Vector2(0f, 1f), "Art/UI/hero-portrait-v2");
            var track = CreateImage("Health Track", plate.transform, new Vector2(62f, -51f), new Vector2(140f, 5f), new Color(0.08f, 0.008f, 0.008f, 1f), new Vector2(0f, 1f));
            healthFill = CreateImage("Health", track.transform, Vector2.zero, new Vector2(140f, 5f), new Color(0.82f, 0.045f, 0.025f, 1f), new Vector2(0f, 1f));
            healthFill.type = Image.Type.Filled;
            healthFill.fillMethod = Image.FillMethod.Horizontal;
        }

        private void BuildObjective()
        {
            var region = CreateImage("Region", safeAreaRoot, new Vector2(0f, -11f), new Vector2(250f, 40f), new Color(0.72f, 0.67f, 0.56f, 0.86f), new Vector2(0.5f, 1f), "Art/UI/panel-v2", false);
            regionTitle = CreateText("EMBERWATCH CAMP", region.transform, new Vector2(0f, -7f), new Vector2(226f, 22f), 16, new Color(0.98f, 0.83f, 0.48f), new Vector2(0.5f, 1f), TextAnchor.UpperCenter);

            var quest = CreateImage("Quest", safeAreaRoot, new Vector2(-18f, -14f), new Vector2(228f, 58f), new Color(0.75f, 0.7f, 0.59f, 0.9f), new Vector2(1f, 1f), "Art/UI/panel-v2", false);
            objectiveTitle = CreateText("THE SEALED APPROACH", quest.transform, new Vector2(12f, -9f), new Vector2(202f, 19f), 13, new Color(0.96f, 0.79f, 0.43f), new Vector2(0f, 1f));
            objectiveProgress = CreateText("Speak with Mara, Ash Warden", quest.transform, new Vector2(12f, -31f), new Vector2(202f, 18f), 11, new Color(0.78f, 0.78f, 0.74f), new Vector2(0f, 1f));
        }

        private void BuildActionBar()
        {
            var bar = CreateImage("Action Bar", safeAreaRoot, new Vector2(0f, 8f), new Vector2(320f, 75f), new Color(0.78f, 0.72f, 0.6f, 0.98f), new Vector2(0.5f, 0f), "Art/UI/panel-v2", false);
            CreateImage("Vitality Vessel", safeAreaRoot, new Vector2(-214f, 5f), new Vector2(92f, 92f), Color.white, new Vector2(0.5f, 0f), "Art/UI/vitality-orb-v2");
            CreateImage("Aether Vessel", safeAreaRoot, new Vector2(214f, 5f), new Vector2(92f, 92f), Color.white, new Vector2(0.5f, 0f), "Art/UI/aether-orb-v2");

            var icons = new[]
            {
                "Art/Icons/skill-chain-arc-v2",
                "Art/Icons/skill-static-dominion-v2",
                "Art/Icons/skill-phase-step-v2",
                "Art/Icons/skill-frozen-star-v2"
            };
            for (var i = 0; i < icons.Length; i++)
            {
                var slot = CreateImage($"Skill {i + 1}", bar.transform, new Vector2(16f + i * 74f, -9f), new Vector2(58f, 58f), Color.clear, new Vector2(0f, 1f));
                var icon = CreateImage("Icon", slot.transform, Vector2.zero, new Vector2(58f, 58f), Color.white, new Vector2(0f, 1f), icons[i]);
                CreateText((i + 1).ToString(), slot.transform, new Vector2(40f, -37f), new Vector2(14f, 16f), 10, new Color(0.95f, 0.8f, 0.45f), new Vector2(0f, 1f), TextAnchor.MiddleCenter);
                var button = icon.gameObject.AddComponent<Button>();
                button.targetGraphic = icon;
                button.transition = Selectable.Transition.ColorTint;
                var colors = button.colors;
                colors.normalColor = Color.white;
                colors.highlightedColor = new Color(1f, 0.92f, 0.72f);
                colors.pressedColor = new Color(0.55f, 0.76f, 1f);
                colors.selectedColor = colors.highlightedColor;
                colors.colorMultiplier = 1.15f;
                colors.fadeDuration = 0.06f;
                button.colors = colors;
                var skill = i;
                button.onClick.AddListener(() => CastSkill(skill));
                cooldownMasks[i] = CreateImage("Cooldown", icon.transform, Vector2.zero, new Vector2(58f, 58f), new Color(0.015f, 0.02f, 0.035f, 0.76f), new Vector2(0f, 1f));
                cooldownMasks[i].type = Image.Type.Filled;
                cooldownMasks[i].fillMethod = Image.FillMethod.Radial360;
                cooldownMasks[i].fillOrigin = (int)Image.Origin360.Top;
                cooldownMasks[i].fillClockwise = false;
                cooldownMasks[i].raycastTarget = false;
                cooldownLabels[i] = CreateText(string.Empty, icon.transform, Vector2.zero, new Vector2(58f, 58f), 17, Color.white, new Vector2(0f, 1f), TextAnchor.MiddleCenter);
            }
        }

        private void BuildBossBar()
        {
            var panel = CreateImage("Boss Bar", safeAreaRoot, new Vector2(0f, -58f), new Vector2(410f, 42f), new Color(0.58f, 0.5f, 0.42f, 0.96f), new Vector2(0.5f, 1f), "Art/UI/panel-v2", false);
            CreateText("THE ASHEN CASTELLAN", panel.transform, new Vector2(14f, -6f), new Vector2(270f, 18f), 13, new Color(1f, 0.78f, 0.42f), new Vector2(0f, 1f));
            bossPhase = CreateText("JUDGMENT I", panel.transform, new Vector2(292f, -6f), new Vector2(102f, 18f), 11, new Color(0.62f, 0.84f, 1f), new Vector2(0f, 1f), TextAnchor.UpperRight);
            var track = CreateImage("Boss Health Track", panel.transform, new Vector2(14f, -27f), new Vector2(380f, 6f), new Color(0.08f, 0.008f, 0.008f, 1f), new Vector2(0f, 1f));
            bossHealthFill = CreateImage("Boss Health", track.transform, Vector2.zero, new Vector2(380f, 6f), new Color(0.7f, 0.045f, 0.025f, 1f), new Vector2(0f, 1f));
            bossHealthFill.type = Image.Type.Filled;
            bossHealthFill.fillMethod = Image.FillMethod.Horizontal;
            bossPanel = panel.gameObject;
            bossPanel.SetActive(false);
        }

        private void BuildTouchStick()
        {
            var ring = CreateImage("Movement Ring", safeAreaRoot, new Vector2(28f, 22f), new Vector2(82f, 82f), new Color(1f, 1f, 1f, 0.52f), new Vector2(0f, 0f), "Art/UI/joystick-v2");
            movementCore = CreateImage("Movement Core", ring.transform, new Vector2(22f, -22f), new Vector2(38f, 38f), new Color(1f, 1f, 1f, 0.68f), new Vector2(0f, 1f), "Art/UI/joystick-core-v2").rectTransform;
        }

        private void BuildContextAction()
        {
            var action = CreateImage("Context Action", safeAreaRoot, new Vector2(-28f, 112f), new Vector2(92f, 48f), new Color(0.92f, 0.7f, 0.32f, 0.98f), new Vector2(1f, 0f), "Art/UI/panel-v2", false);
            contextActionLabel = CreateText("SPEAK", action.transform, Vector2.zero, new Vector2(92f, 48f), 14, new Color(1f, 0.84f, 0.46f), new Vector2(0.5f, 0.5f), TextAnchor.MiddleCenter);
            var button = action.gameObject.AddComponent<Button>();
            button.targetGraphic = action;
            button.onClick.AddListener(() => flow?.Interact());
            contextAction = action.gameObject;
        }

        private void Update()
        {
            if (Screen.safeArea != lastSafeArea) ApplySafeArea();
            if (player == null || healthFill == null) return;
            if (movementCore != null) movementCore.anchoredPosition = new Vector2(22f, -22f) + player.MovementInput * 12f;
            healthFill.fillAmount = player.Health.Current / player.Health.Maximum;
            if (Time.unscaledTime >= nextObjectiveRefresh)
            {
                regionTitle.text = flow.ZoneName;
                heroName.text = $"DUSKWEAVER  LV {player.Level}";
                heroPower.text = player.CovenantName == "UNBOUND" ? $"SPELL POWER  {player.SpellPower:0.00}" : $"{player.SpellPower:0.00}  •  {player.CovenantName}";
                objectiveTitle.text = flow.ObjectiveTitle;
                var remaining = flow.RemainingEnemies;
                objectiveProgress.text = remaining > 0 ? $"{flow.ObjectiveDetail}  •  {remaining} remain" : flow.ObjectiveDetail;
                contextAction.SetActive(flow.CanInteract);
                contextActionLabel.text = flow.InteractionLabel;
                var boss = FindFirstObjectByType<BossController>();
                bossPanel.SetActive(boss != null);
                if (boss != null)
                {
                    bossHealthFill.fillAmount = boss.HealthNormalized;
                    bossPhase.text = $"JUDGMENT {Roman(boss.Phase)}";
                }
                nextObjectiveRefresh = Time.unscaledTime + 0.2f;
            }
            for (var i = 0; i < cooldownMasks.Length; i++)
            {
                var remaining = player.GetCooldownNormalized(i);
                cooldownMasks[i].fillAmount = remaining;
                cooldownLabels[i].text = remaining > 0f ? Mathf.CeilToInt(remaining * player.GetCooldownDuration(i)).ToString() : string.Empty;
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

        private static string Roman(int value) => value switch
        {
            1 => "I",
            2 => "II",
            _ => "III"
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
            if (!string.IsNullOrEmpty(resource))
            {
                var slicedPanel = resource == "Art/UI/panel-v2" && !preserveAspect;
                image.sprite = LoadSprite(resource, slicedPanel ? 128f : 0f);
                if (slicedPanel) image.type = Image.Type.Sliced;
            }
            image.preserveAspect = preserveAspect;
            return image;
        }

        private static Sprite LoadSprite(string resource, float border = 0f)
        {
            var texture = Resources.Load<Texture2D>(resource);
            if (texture == null) return null;
            var spriteBorder = border > 0f ? Vector4.one * border : Vector4.zero;
            return Sprite.Create(texture, new Rect(0f, 0f, texture.width, texture.height), new Vector2(0.5f, 0.5f), 100f, 0, SpriteMeshType.FullRect, spriteBorder);
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
