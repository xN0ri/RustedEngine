export const renderingCameraDoc = {
  id: "rendering-camera",
  title: "9. 🖼️ Kamera 2D & Skalowanie Retro",
  icon: "Camera",
  badge: "Rendering & Camera",
  description: "Pipeline skalowania wirtualnej rozdzielczości (Virtual Resolution), zaawansowany kontroler kamery 2D ze śledzeniem, wyprzedzaniem ruchu, shake oraz cullingiem widoku.",
  sections: [
    {
      id: "virtual-resolution-pipeline",
      title: "1. Pipeline Wirtualnej Rozdzielczości (Virtual Resolution)",
      content: `Gdy gra jest projektowana w stałej rozdzielczości pikselowej (np. \`480 × 270\` lub \`320 × 180\`), włączenie opcji **\`Engine::with_virtual_resolution(vw, vh)\`** przełącza silnik w dwufazowy kompozytowy pipeline renderowania:

1. **Bufor Wirtualny (\`SceneRenderTarget\`)**: Świat gry jest rysowany w rozdzielczości wirtualnej z filtrowaniem pikselowym.
2. **Kompozycja z Letterboxingiem**: Bufor wirtualny jest skalowany na środek okna z zachowaniem proporcji.
3. **Natywny Layer Tekstowy**: Teksty i logi są rysowane na fizycznej rozdzielczości ekranu dla idealnej ostrości.`,
      codeExamples: [
        {
          title: "Włączenie Wirtualnej Rozdzielczości i Koloru Ramek Letterbox",
          code: `Engine::new(scenes)
    .with_virtual_resolution(480.0, 270.0) // 16:9 pixel-art resolution
    .with_integer_scaling(true)           // Piksele w idealnej skali
    .with_letterbox_color(DARKGRAY)       // Kolor pasów letterboxu
    .run()
    .await;`,
          collapsible: false
        }
      ]
    },
    {
      id: "camera-system",
      title: "2. Kontroler Kamery 2D (`Camera`) & Wstrząsy (Shake)",
      content: `Struktura **\`Camera\`** (\`ctx.camera\`) zarządza widokiem 2D, śledzeniem obiektów, wstrząsami oraz cullingiem:

- **\`ctx.camera.follow(target, speed, dt)\`**: Płynne podążanie z interpolacją liniową (\`lerp\`).
- **\`ctx.camera.look_ahead(pos, vel, dist, speed, dt)\`**: Wyprzedzanie ruchu w stronę biegu postaci.
- **\`ctx.camera.shake(duration, intensity)\`**: Dynamiczny wstrząs ekranu przy uderzeniach i eksplozjach.
- **\`ctx.camera.is_on_screen(pos, margin)\`**: Sprawdza, czy obiekt znajduje się w polu widzenia kamery (Frustum Culling).`,
      codeExamples: [
        {
          title: "Płynne Wyprzedzanie Ruchu Gracza i Wstrząs Kamery",
          code: `// Wyprzedzanie kamery o 80px w kierunku ruchu postaci:
ctx.camera.look_ahead(player.position, player.velocity, 80.0, 4.0, ctx.dt());

// Wstrząs po sygnale eksplozji:
if ctx.events.poll_signal("explosion") {
    ctx.camera.shake(0.3, 10.0);
}`,
          collapsible: false
        }
      ]
    }
  ]
};
