using System.Collections;
using Nightfall3.Flow;
using UnityEngine;
using UnityEngine.UI;

namespace Nightfall3.Presentation
{
    public sealed class CinematicDirector : MonoBehaviour
    {
        private DemoFlowController flow;
        private CanvasGroup overlay;
        private RectTransform topBar;
        private RectTransform bottomBar;
        private Text title;
        private Text subtitle;
        private string previousPhase;
        private Coroutine activeCue;

        public static CinematicDirector Create(DemoFlowController demoFlow)
        {
            var root = new GameObject("Cinematic Presentation", typeof(Canvas), typeof(CanvasScaler), typeof(CinematicDirector));
            var canvas = root.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 130;
            var scaler = root.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(844f, 390f);
            scaler.matchWidthOrHeight = 0.65f;
            var director = root.GetComponent<CinematicDirector>();
            director.flow = demoFlow;
            director.Build();
            return director;
        }

        private void Build()
        {
            overlay = new GameObject("Overlay", typeof(RectTransform), typeof(CanvasGroup)).GetComponent<CanvasGroup>();
            overlay.transform.SetParent(transform, false);
            var root = (RectTransform)overlay.transform;
            root.anchorMin = Vector2.zero;
            root.anchorMax = Vector2.one;
            root.offsetMin = root.offsetMax = Vector2.zero;
            overlay.alpha = 0f;
            overlay.blocksRaycasts = false;
            overlay.interactable = false;

            topBar = CreateBar("Top Letterbox", new Vector2(0f, 1f), new Vector2(1f, 1f), new Vector2(0.5f, 1f));
            bottomBar = CreateBar("Bottom Letterbox", new Vector2(0f, 0f), new Vector2(1f, 0f), new Vector2(0.5f, 0f));
            title = CreateText("CUE TITLE", new Vector2(0.5f, 0.53f), new Vector2(660f, 42f), 28, new Color(1f, 0.82f, 0.48f));
            subtitle = CreateText("CUE SUBTITLE", new Vector2(0.5f, 0.43f), new Vector2(680f, 24f), 14, new Color(0.75f, 0.78f, 0.82f));
        }

        private IEnumerator Start()
        {
            previousPhase = flow != null ? flow.PhaseId : string.Empty;
            yield return new WaitForSecondsRealtime(0.35f);
            PlayCue("EMBERWATCH", "THE LAST SAFE FLAME", new Vector3(0f, 0f, -8.4f), 3.2f, 33f);
        }

        private void Update()
        {
            if (flow == null || flow.PhaseId == previousPhase) return;
            previousPhase = flow.PhaseId;
            switch (previousPhase)
            {
                case "GateFight":
                    PlayCue("THE SEALED APPROACH", "BLOODBOUND AT THE GATE", new Vector3(0f, 0f, 0.5f), 2.25f, 34f);
                    break;
                case "CausewayFight":
                    PlayCue("THE BROKEN CAUSEWAY", "THE RAVENING LINE", new Vector3(0f, 0f, 15f), 2.1f, 33f);
                    break;
                case "EliteFight":
                    PlayCue("WARDEN OF BLUE ASH", "AN ELITE HUNT BEGINS", new Vector3(0f, 0f, 28.5f), 2.35f, 31f);
                    break;
                case "WardRitual":
                    PlayCue("THE COLD WARD", "SHATTER THE THREE SEALS", new Vector3(0f, 0f, 23f), 2.4f, 32f);
                    break;
                case "BossFight":
                    PlayCue("THE ASHEN CASTELLAN", "FIRST JUDGMENT: CLEAVING OATH", new Vector3(0f, 0f, 33.2f), 3.1f, 29f);
                    break;
                case "ClaimReward":
                    PlayCue("THE CASTELLAN FALLS", "AN EMBER-BOUND RELIC REMAINS", new Vector3(0f, 0f, 33.2f), 2.7f, 31f);
                    break;
                case "Complete":
                    PlayCue("THE GATE REMEMBERS", "ASHEN APPROACH CLEARED", Camera.main != null ? Camera.main.transform.position + Camera.main.transform.forward * 8f : Vector3.zero, 3.5f, 34f);
                    break;
            }
        }

        private void PlayCue(string heading, string detail, Vector3 focus, float duration, float fieldOfView)
        {
            if (activeCue != null) StopCoroutine(activeCue);
            activeCue = StartCoroutine(CueRoutine(heading, detail, duration));
            Camera.main?.GetComponent<CameraRig>()?.Focus(focus, duration, fieldOfView);
        }

        private IEnumerator CueRoutine(string heading, string detail, float duration)
        {
            title.text = heading;
            subtitle.text = detail;
            for (var t = 0f; t < 1f; t += Time.unscaledDeltaTime * 4.5f)
            {
                overlay.alpha = Mathf.SmoothStep(0f, 1f, t);
                SetBarHeight(Mathf.Lerp(0f, 35f, t));
                yield return null;
            }
            overlay.alpha = 1f;
            SetBarHeight(35f);
            yield return new WaitForSecondsRealtime(Mathf.Max(0.35f, duration - 0.9f));
            for (var t = 0f; t < 1f; t += Time.unscaledDeltaTime * 3.2f)
            {
                overlay.alpha = 1f - Mathf.SmoothStep(0f, 1f, t);
                SetBarHeight(Mathf.Lerp(35f, 0f, t));
                yield return null;
            }
            overlay.alpha = 0f;
            SetBarHeight(0f);
            activeCue = null;
        }

        private void SetBarHeight(float height)
        {
            topBar.sizeDelta = new Vector2(0f, height);
            bottomBar.sizeDelta = new Vector2(0f, height);
        }

        private RectTransform CreateBar(string name, Vector2 anchorMin, Vector2 anchorMax, Vector2 pivot)
        {
            var bar = new GameObject(name, typeof(RectTransform), typeof(CanvasRenderer), typeof(Image)).GetComponent<RectTransform>();
            bar.SetParent(overlay.transform, false);
            bar.anchorMin = anchorMin;
            bar.anchorMax = anchorMax;
            bar.pivot = pivot;
            bar.anchoredPosition = Vector2.zero;
            bar.sizeDelta = Vector2.zero;
            bar.GetComponent<Image>().color = new Color(0.005f, 0.004f, 0.006f, 0.96f);
            return bar;
        }

        private Text CreateText(string value, Vector2 anchor, Vector2 size, int fontSize, Color color)
        {
            var text = new GameObject(value, typeof(RectTransform), typeof(CanvasRenderer), typeof(Text), typeof(Outline)).GetComponent<Text>();
            text.transform.SetParent(overlay.transform, false);
            var rect = (RectTransform)text.transform;
            rect.anchorMin = rect.anchorMax = anchor;
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = Vector2.zero;
            rect.sizeDelta = size;
            text.text = value;
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = fontSize;
            text.fontStyle = FontStyle.Bold;
            text.alignment = TextAnchor.MiddleCenter;
            text.color = color;
            text.raycastTarget = false;
            var outline = text.GetComponent<Outline>();
            outline.effectColor = new Color(0f, 0f, 0f, 0.96f);
            outline.effectDistance = new Vector2(2f, -2f);
            return text;
        }
    }
}
