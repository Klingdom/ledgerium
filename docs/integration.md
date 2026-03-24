# **Ledgerium AI**

## **Integration Specification: Chrome Extension → JSON → Process Intelligence Platform**

---

## **Introduction**

Ledgerium AI is a process intelligence platform built on a foundational principle: workflows should be derived from **observed reality**, not assumptions, interviews, or documentation exercises. Traditional process discovery methods rely heavily on subjective input, which leads to inconsistencies, inaccuracies, and a lack of trust in the resulting outputs. Ledgerium AI replaces this paradigm with a deterministic, evidence-based system that captures actual user behavior and transforms it into structured process intelligence.

At the core of this system is a Chrome browser extension that records user interactions in real time and converts them into structured JSON. This JSON serves as the canonical representation of a workflow session and becomes the input for the Ledgerium Process Intelligence Platform. Through deterministic processing, the platform transforms raw behavioral data into process maps, standard operating procedures (SOPs), and metrics dashboards.

This document defines the full integration architecture, data models, processing logic, and developer-facing interfaces required to implement and extend this system.

---

## **System Architecture Overview**

The Ledgerium AI system is composed of two primary layers: the **Behavior Capture Layer** and the **Process Intelligence Layer**. These layers are connected through a structured JSON contract that ensures consistency, traceability, and extensibility.

The lifecycle begins with a user performing actions within a browser. The Chrome extension observes these interactions and records them as atomic events. These events are aggregated into a session and exported as structured JSON. The JSON is then ingested by the Process Intelligence Platform, where it undergoes deterministic transformation into higher-order constructs such as steps, flows, and process definitions. Finally, these constructs are rendered into human-consumable outputs including visual process maps, SOPs, and analytics dashboards.

This architecture ensures that every output can be traced back to real user behavior, enabling full auditability and trust.

---

## **Chrome Extension: Behavior Capture Layer**

The Chrome extension is responsible for capturing user behavior in a way that is both comprehensive and non-intrusive. It operates as a passive observer that records interactions without interfering with the user’s workflow. At the same time, it provides a transparent interface that allows users to see what is being recorded, reinforcing trust and control.

When a user initiates a recording session, the extension begins listening to a variety of browser and DOM events. These include clicks, text inputs, navigation events, scrolling behavior, focus changes, and form submissions. Each interaction is captured as a discrete event with a precise timestamp and contextual metadata.

The extension enriches each event with additional information such as the current URL, page title, and DOM element attributes including selectors, text content, and element type. This contextual enrichment is critical for enabling downstream deterministic processing, as it provides the necessary signals to interpret user intent without relying on probabilistic inference.

Throughout the session, events are streamed into an in-memory structure that represents the ongoing session. The extension also provides a sidebar interface that displays the live event feed, allowing users to observe the recording in real time. This interface includes controls for starting, pausing, and stopping the recording, as well as options for labeling the session.

Once the session is stopped, the extension compiles all recorded events into a structured JSON object. This JSON becomes the authoritative representation of the workflow and is either stored locally or transmitted to the backend platform for further processing.

---

## **Event Model and Data Capture**

Each user interaction is represented as an event object. The event model is designed to be minimal yet expressive, capturing only what is necessary to reconstruct the workflow while avoiding unnecessary complexity.

An event includes a unique identifier, a timestamp in ISO 8601 format, and a type that categorizes the interaction. Supported event types include click, input, navigation, scroll, focus, blur, submit, and custom events for extensibility. The event also includes a target object that describes the DOM element involved in the interaction, including its selector, visible text, and HTML tag.

In addition to the target, each event includes a page object that captures the URL and title of the current page. Optional metadata fields allow for the inclusion of additional context such as input values or scroll positions when relevant. Every event is associated with a session identifier, ensuring that all interactions can be grouped into a coherent workflow.

This event model is intentionally deterministic. It does not attempt to interpret or label user intent at capture time. Instead, it preserves raw behavioral data, allowing interpretation to occur later in a controlled and reproducible manner.

---

## **Session JSON: Canonical Workflow Representation**

Once a recording session is complete, all captured events are compiled into a session JSON object. This object serves as the single source of truth for the workflow and is the primary input to the Process Intelligence Platform.

The session JSON includes metadata describing the session, such as its creation timestamp, total duration, source, and optional user-provided labels. It also contains the full list of events recorded during the session.

In addition to raw events, the session JSON may include derived structures such as steps and segments. These are generated either within the extension or during initial processing in the backend. Steps represent grouped sequences of events that form meaningful units of work, while segments represent higher-level phases within the workflow.

By structuring the session data in this way, Ledgerium AI creates a bridge between raw behavioral data and higher-order process constructs.

---

## **Deterministic Processing Engine**

The Process Intelligence Platform is responsible for transforming session JSON into structured process definitions. This transformation is performed by a deterministic processing engine that applies a series of rule-based operations to the data.

The processing pipeline begins with normalization, where events are cleaned, validated, and standardized. This step ensures that inconsistencies in event data do not propagate through the system.

Next, the engine performs step extraction. This involves grouping related events into coherent steps based on temporal proximity, interaction patterns, and contextual signals. For example, a sequence of input events followed by a submit action may be grouped into a single step representing form completion.

Once steps are identified, the engine performs segmentation, dividing the workflow into logical phases such as entry, core execution, and completion. This segmentation enables higher-level analysis and improves the readability of generated outputs.

The engine then constructs a process graph, where each step is represented as a node and transitions between steps are represented as edges. The graph captures the structure of the workflow, including branching paths and loops.

Finally, the engine aggregates this information into a process definition object. This object includes the set of steps, the relationships between them, identified variants, and computed metrics.

Because the entire pipeline is deterministic, the same input JSON will always produce the same output. This ensures reproducibility and enables full auditability of the system.

---

## **Process Definition and Output Generation**

The process definition is the central artifact produced by the platform. It represents a structured and comprehensive model of the workflow, derived entirely from observed behavior.

From this definition, the platform generates multiple types of outputs. Process maps are visual representations of the workflow, where steps are displayed as nodes and transitions as directed edges. These maps can highlight common paths, alternative variants, and performance characteristics such as step duration.

SOPs are generated by translating each step into a human-readable instruction. The deterministic nature of the system ensures that these instructions are consistent and aligned with actual user behavior. Additional enhancements such as screenshots or field-level details can be incorporated to improve clarity.

Metrics dashboards provide quantitative insights into the workflow. These include measures such as average completion time, step-level durations, drop-off rates, and the frequency of different variants. Because these metrics are derived directly from event data, they reflect real performance rather than estimated values.

---

## **TypeScript Interfaces**

To support development and integration, the system defines a set of TypeScript interfaces that mirror the underlying data models.

The `Event` interface represents a single user interaction, including its type, timestamp, target element, and associated metadata. The `Session` interface encapsulates a complete recording session, including its metadata and list of events.

The `Step` interface represents a grouped set of events with a defined start and end time, while the `Segment` interface represents a collection of related steps. The `ProcessDefinition` interface brings together all components of the workflow, including steps, flows, variants, and metrics.

Additional interfaces such as `Flow`, `Variant`, and `Metrics` provide structure for specific aspects of the process model. These interfaces ensure type safety and consistency across the codebase, making it easier to build and maintain the system.

---

## **Deterministic Rules and Processing Logic**

A key differentiator of Ledgerium AI is its reliance on deterministic rules rather than probabilistic inference. These rules govern how events are grouped into steps, how steps are named, and how workflows are segmented.

Step extraction rules define how sequences of events are combined. For example, multiple rapid clicks may be grouped into a single step, while a navigation event typically marks the boundary between steps. Idle time thresholds can also be used to detect transitions between distinct activities.

Naming rules determine how steps are labeled. Whenever possible, the system uses visible text from UI elements, such as button labels, to generate meaningful names. When this information is not available, the system falls back to page context or generic descriptors.

Segmentation rules divide the workflow into phases based on structural and temporal cues. These rules enable the system to distinguish between different parts of the process, such as initial setup, core execution, and finalization.

Because these rules are explicit and transparent, they can be reviewed, modified, and extended as needed. This provides a level of control and predictability that is not possible with purely AI-driven systems.

---

## **API Contracts and Integration Points**

The Process Intelligence Platform exposes a set of APIs for interacting with session data and generated outputs. These APIs enable integration with external systems and support automation workflows.

The `POST /sessions` endpoint allows clients to submit session JSON for processing. The `POST /processes/generate` endpoint triggers the creation of a process definition from a given session. The `GET /processes/:id` endpoint retrieves the generated process definition, while the `GET /metrics/:process_id` endpoint provides access to computed metrics.

These APIs are designed to be simple and consistent, reflecting the structured nature of the underlying data. They enable both real-time and batch processing scenarios, making the platform flexible and scalable.

---

## **Future Extensions**

While the current system focuses on single-session processing, it is designed to support future enhancements such as multi-session aggregation. This capability would allow the platform to combine multiple recordings into a unified process model, identifying common patterns and best practices across users.

Additional extensions include cross-user analysis, process portfolio management, and AI augmentation layers. These features would build on the deterministic foundation to provide deeper insights and optimization recommendations while maintaining transparency and control.

---

## **Conclusion**

Ledgerium AI represents a shift from opinion-based process documentation to evidence-based process intelligence. By capturing real user behavior through a Chrome extension and transforming it into structured JSON, the platform creates a deterministic pipeline that produces accurate, reliable, and actionable outputs.

This approach ensures that every process map, SOP, and metric is grounded in reality. It eliminates ambiguity, reduces manual effort, and builds trust in the resulting insights. As organizations increasingly rely on automation and AI-driven workflows, this foundation of deterministic, behavior-based intelligence becomes essential.

Ledgerium AI does not attempt to guess how work is done. It records what actually happens and turns it into a system that can be understood, improved, and scaled.

