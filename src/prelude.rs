//! Prelude re-exporting common structs, traits, enums, and macros for easy importing via `use RustyEngine::prelude::*;`.

pub use crate::{
    actions::ActionMap,
    asset_manager::Assets,
    audio::{AmbientPool, Audio},
    camera::Camera,
    draggable::{DragState, Draggable},
    engine::{Context, CustomCursor, Engine},
    input::Input,
    object::{Behavior, Clickable, GameObject, Rectangle, Side, Sprite},
    particles::{Particle, ParticleEmitter},
    postprocess::{PostProcess, SceneRenderTarget},
    scene::{Scene, SceneManager},
    sequence::{Sequence, Step},
    state::{StateStore, StateValue},
    time::{Time, Timer},
    ui::{Button, Panel, ProgressBar, RevealMode, Text, TextObject, UI},
    window::Window,
    world::{Object, World},
    world, world_objects,
};
