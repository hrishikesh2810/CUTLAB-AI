import streamlit as st
import requests
import pandas as pd
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BACKEND_URL = "http://127.0.0.1:8000"

# File to persist active project ID
PROJECT_STATE_FILE = os.path.join(os.path.dirname(__file__), ".active_project")

def save_active_project(project_id: str):
    """Save active project ID to file for persistence."""
    try:
        with open(PROJECT_STATE_FILE, 'w') as f:
            f.write(project_id)
    except:
        pass

def load_active_project() -> str:
    """Load active project ID from file."""
    try:
        if os.path.exists(PROJECT_STATE_FILE):
            with open(PROJECT_STATE_FILE, 'r') as f:
                return f.read().strip()
    except:
        pass
    return None

def set_custom_css():
    st.markdown("""
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        .stApp {
            background: linear-gradient(135deg, #0E1117 0%, #1a1a2e 100%);
            font-family: 'Inter', sans-serif;
        }

        .stButton>button {
            width: 100%;
            border-radius: 10px;
            background: linear-gradient(90deg, #FF4B4B 0%, #FF914D 100%);
            border: none;
            color: white;
            font-weight: 600;
            padding: 0.6rem 1rem;
            transition: all 0.3s ease;
        }
        .stButton>button:hover {
            opacity: 0.9;
            transform: scale(1.02);
            box-shadow: 0 4px 20px rgba(255, 75, 75, 0.4);
        }
        
        .stDownloadButton>button {
            background: linear-gradient(90deg, #00C853 0%, #00E676 100%) !important;
        }
        
        .timeline-clip {
            background: rgba(255, 145, 77, 0.2);
            border: 1px solid rgba(255, 145, 77, 0.5);
            border-radius: 8px;
            padding: 10px;
            margin: 5px 0;
        }
    </style>
    """, unsafe_allow_html=True)


def convert_scenes_to_timeline(scenes, project_id):
    """Convert AI scenes to timeline clips."""
    clips = []
    for s in scenes:
        dur = s['end_time'] - s['start_time']
        clips.append({
            "clip_id": f"scene_{s['scene_id']}_{project_id[:4]}",
            "label": f"Scene {s['scene_id']}",
            "source_video": project_id,
            "start_seconds": s['start_time'], # Source In
            "end_seconds": s['end_time'],     # Source Out
            "duration": dur,
            "speed": 1.0,
            "transform": {"scale": 1.0, "x": 0, "y": 0}
        })
    return {"clips": clips, "duration": sum(c['duration'] for c in clips), "transitions": []}

def get_audio_emoji(label: str) -> str:
    """Get emoji for audio label."""
    label_lower = label.lower()
    if 'silence' in label_lower:
        return '🔇'
    elif 'peak' in label_lower:
        return '🎵'
    elif 'high' in label_lower:
        return '🔊'
    elif 'low' in label_lower:
        return '📉'
    else:
        return '🎧'


def load_project_data(project_id: str) -> bool:
    """Load project data from backend into session state."""
    try:
        response = requests.get(f"{BACKEND_URL}/project/{project_id}")
        if response.status_code == 200:
            data = response.json()
            st.session_state.project_id = project_id
            st.session_state.metadata = data['metadata']
            st.session_state.scenes = data['scenes'] if data['scenes'] else None
            st.session_state.suggestions = data['suggestions'] if data['suggestions'] else None
            save_active_project(project_id)
            return True
    except:
        pass
    return False


def load_workspace_timeline(project_id: str):
    """Load workspace timeline from backend."""
    try:
        response = requests.get(f"{BACKEND_URL}/workspace/{project_id}/timeline")
        if response.status_code == 200:
            data = response.json()
            st.session_state.workspace_timeline = data['timeline']
            return True
    except:
        pass
    return False


def render_suggestion_card(suggestion: dict, index: int) -> bool:
    """Render a single cut suggestion card using native Streamlit components."""
    conf = suggestion['confidence']
    metrics = suggestion['metrics']
    audio_label = suggestion.get('audio_label', 'Unknown')
    
    with st.expander(
        f"🎬 Scene {suggestion['scene_id']} — {suggestion['suggestion_type']} | "
        f"{get_audio_emoji(audio_label)} {audio_label} | "
        f"**{conf:.0%}** Confidence",
        expanded=True
    ):
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Start", suggestion['cut_start'])
        with col2:
            st.metric("End", suggestion['cut_end'])
        with col3:
            dur = metrics['duration']
            dur_ms = int((dur % 1) * 1000)
            dur_sec = int(dur)
            st.metric("Duration", f"{dur_sec}.{dur_ms:03d}s")
        
        st.markdown("##### 📊 Analysis Metrics")
        m_col1, m_col2, m_col3, m_col4, m_col5 = st.columns(5)
        
        with m_col1:
            st.metric("🏃 Motion", f"{metrics['motion_intensity']:.0%}")
        with m_col2:
            st.metric("🔇 Silence", f"{metrics['silence_level']:.0%}")
        with m_col3:
            st.metric("🔊 Energy", f"{metrics['audio_energy']:.0%}")
        with m_col4:
            st.metric("👤 Face", "Yes" if metrics['has_faces'] else "No")
        with m_col5:
            st.metric("🔁 Repetitive", f"{metrics['repetitiveness']:.0%}")
        
        if metrics.get('has_audio_peaks'):
            st.info(f"🎵 {metrics['peak_count']} audio peak(s) detected in this segment")
        
        st.markdown("##### 💡 Reason")
        st.warning(suggestion['reason'])
        
        accepted = st.checkbox("✅ Accept this suggestion", key=f"accept_{suggestion['scene_id']}_{index}", value=True)
        
        return accepted


def render_timeline_clip(clip: dict, index: int, video_duration: float = 60.0, prev_bound: float = 0.0, next_bound: float = float('inf')):
    """Render a timeline clip with advanced edit controls."""
    clip_id = clip['clip_id']
    
    with st.expander(f"🎬 {clip['label']} | {clip['start_formatted']} → {clip['end_formatted']} | {clip['speed']}x", expanded=False):
        # 1. Shift Position (Horizontal Move)
        st.markdown("##### ↔️ Shift Position")
        # Ensure bounds are floats
        prev_bound = float(prev_bound)
        next_bound = float(next_bound)
        
        # Calculate max allow shift
        # Current Start: clip['start_seconds']
        # Slider range: prev_bound to (next_bound - duration)
        
        # Guard against infinity for slider
        safe_max = next_bound if next_bound != float('inf') else video_duration
        # Subtract duration to get max START position
        max_start = max(prev_bound, safe_max - (clip['end_seconds'] - clip['start_seconds']))
        
        if max_start > prev_bound:
             new_start_shift = st.slider(
                "Timeline Start",
                min_value=prev_bound,
                max_value=max_start,
                value=float(clip['start_seconds']),
                step=0.1,
                key=f"shift_{clip_id}"
            )
             
             if new_start_shift != float(clip['start_seconds']):
                 # Trigger Move Logic via Update
                 delta = new_start_shift - clip['start_seconds']
                 if st.button(f"Confirm Shift to {new_start_shift}s", key=f"confirm_shift_{clip_id}"):
                     try:
                        requests.put(
                            f"{BACKEND_URL}/workspace/{st.session_state.project_id}/timeline/clip/{clip_id}",
                            json={
                                "start_seconds": new_start_shift,
                                "end_seconds": clip['end_seconds'] + delta
                            }
                        )
                        st.rerun()
                     except:
                         pass
        
        st.divider()

        # Info row
        info_col1, info_col2, info_col3 = st.columns(3)
        with info_col1:
            st.metric("In Point", clip['start_formatted'])
        with info_col2:
            st.metric("Out Point", clip['end_formatted'])
        with info_col3:
            st.metric("Duration", clip['duration_formatted'])
        
        st.divider()
        
        # Editing Tools
        st.markdown("##### ✂️ Editing Tools")
        
        tool_col1, tool_col2, tool_col3, tool_col4 = st.columns(4)
        
        # === SPLIT TOOL ===
        with tool_col1:
            st.caption("**Split**")
            split_pos = st.number_input(
                "Split at (sec)",
                min_value=clip['start_seconds'] + 0.1,
                max_value=clip['end_seconds'] - 0.1,
                value=(clip['start_seconds'] + clip['end_seconds']) / 2,
                step=0.1,
                key=f"split_pos_{clip_id}"
            )
            if st.button("✂️ Split", key=f"split_btn_{clip_id}", use_container_width=True):
                try:
                    response = requests.post(
                        f"{BACKEND_URL}/workspace/{st.session_state.project_id}/timeline/clip/{clip_id}/split",
                        json={"split_position": split_pos}
                    )
                    if response.status_code == 200:
                        st.session_state.workspace_timeline = response.json()['timeline']
                        st.toast("Clip split!", icon="✂️")
                        st.rerun()
                    else:
                        st.error("Split failed")
                except Exception as e:
                    st.error(f"Error: {e}")
        
        # === TRIM IN ===
        with tool_col2:
            st.caption("**Trim In**")
            new_start = st.number_input(
                "New start (sec)",
                min_value=0.0,
                max_value=clip['end_seconds'] - 0.1,
                value=clip['start_seconds'],
                step=0.1,
                key=f"trim_in_{clip_id}"
            )
            if st.button("⬅️ Trim In", key=f"trim_in_btn_{clip_id}", use_container_width=True):
                try:
                    response = requests.post(
                        f"{BACKEND_URL}/workspace/{st.session_state.project_id}/timeline/clip/{clip_id}/trim-in",
                        json={"new_position": new_start}
                    )
                    if response.status_code == 200:
                        st.session_state.workspace_timeline = response.json()['timeline']
                        st.toast("In-point trimmed!", icon="⬅️")
                        st.rerun()
                    else:
                        st.error("Trim failed")
                except Exception as e:
                    st.error(f"Error: {e}")
        
        # === TRIM OUT ===
        with tool_col3:
            st.caption("**Trim Out**")
            new_end = st.number_input(
                "New end (sec)",
                min_value=clip['start_seconds'] + 0.1,
                max_value=video_duration,
                value=clip['end_seconds'],
                step=0.1,
                key=f"trim_out_{clip_id}"
            )
            if st.button("➡️ Trim Out", key=f"trim_out_btn_{clip_id}", use_container_width=True):
                try:
                    response = requests.post(
                        f"{BACKEND_URL}/workspace/{st.session_state.project_id}/timeline/clip/{clip_id}/trim-out",
                        json={"new_position": new_end}
                    )
                    if response.status_code == 200:
                        st.session_state.workspace_timeline = response.json()['timeline']
                        st.toast("Out-point trimmed!", icon="➡️")
                        st.rerun()
                    else:
                        st.error("Trim failed")
                except Exception as e:
                    st.error(f"Error: {e}")
        
        # === SPEED CONTROL ===
        with tool_col4:
            st.caption("**Speed**")
            speed_options = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 4.0]
            current_speed_idx = speed_options.index(clip['speed']) if clip['speed'] in speed_options else 3
            new_speed = st.selectbox(
                "Speed",
                options=speed_options,
                index=current_speed_idx,
                format_func=lambda x: f"{x}x",
                key=f"speed_{clip_id}"
            )
            if st.button("🏃 Set Speed", key=f"speed_btn_{clip_id}", use_container_width=True):
                try:
                    response = requests.post(
                        f"{BACKEND_URL}/workspace/{st.session_state.project_id}/timeline/clip/{clip_id}/speed",
                        json={"speed": new_speed}
                    )
                    if response.status_code == 200:
                        st.session_state.workspace_timeline = response.json()['timeline']
                        st.toast(f"Speed set to {new_speed}x!", icon="🏃")
                        st.rerun()
                    else:
                        st.error("Speed change failed")
                except Exception as e:
                    st.error(f"Error: {e}")
        
        st.divider()
        
        # Delete button
        if st.button("🗑️ Delete Clip", key=f"del_clip_{clip_id}", use_container_width=True, type="secondary"):
            try:
                response = requests.delete(
                    f"{BACKEND_URL}/workspace/{st.session_state.project_id}/timeline/clip/{clip_id}"
                )
                if response.status_code == 200:
                    st.session_state.workspace_timeline = response.json()['timeline']
                    st.toast("Clip removed!", icon="✅")
                    st.rerun()
            except:
                st.error("Failed to remove clip")


def render_transition_control(from_clip: dict, to_clip: dict, existing_transition: dict = None):
    """Render transition control between two clips."""
    from_id = from_clip['clip_id']
    to_id = to_clip['clip_id']
    key_base = f"trans_{from_id}_{to_id}"
    
    # Transition types with icons
    TRANSITION_OPTIONS = {
        "cut": "✂️ Hard Cut",
        "cross-dissolve": "🔀 Cross Dissolve",
        "fade-in": "🌅 Fade In",
        "fade-out": "🌆 Fade Out",
        "fade-in-out": "🌓 Fade In/Out"
    }
    
    current_type = existing_transition['type'] if existing_transition else "cut"
    current_duration = existing_transition['duration'] if existing_transition else 0.5
    
    with st.container():
        col1, col2, col3 = st.columns([2, 2, 1])
        
        with col1:
            new_type = st.selectbox(
                "Transition",
                options=list(TRANSITION_OPTIONS.keys()),
                index=list(TRANSITION_OPTIONS.keys()).index(current_type) if current_type in TRANSITION_OPTIONS else 0,
                format_func=lambda x: TRANSITION_OPTIONS[x],
                key=f"{key_base}_type",
                label_visibility="collapsed"
            )
        
        with col2:
            new_duration = st.slider(
                "Duration",
                min_value=0.1,
                max_value=3.0,
                value=current_duration,
                step=0.1,
                key=f"{key_base}_dur",
                label_visibility="collapsed",
                disabled=(new_type == "cut")
            )
        
        with col3:
            if st.button("✓ Apply", key=f"{key_base}_apply", use_container_width=True):
                try:
                    response = requests.post(
                        f"{BACKEND_URL}/workspace/{st.session_state.project_id}/timeline/transition",
                        json={
                            "from_clip_id": from_id,
                            "to_clip_id": to_id,
                            "transition_type": new_type,
                            "duration": new_duration if new_type != "cut" else 0.0
                        }
                    )
                    if response.status_code == 200:
                        st.session_state.workspace_timeline = response.json()['timeline']
                        st.toast(f"Transition set: {TRANSITION_OPTIONS[new_type]}", icon="✨")
                        st.rerun()
                except Exception as e:
                    st.error(f"Failed: {e}")


def main():
    st.set_page_config(
        page_title="CUTLAB AI",
        page_icon="🎬",
        layout="wide"
    )
    set_custom_css()

    st.title("🎬 CUTLAB AI")
    st.caption("Next-Gen Python-Only AI Video Editor • Audio-Aware Smart Cut Suggestions")

    st.divider()
    
    # Initialize session state
    if 'project_id' not in st.session_state:
        st.session_state.project_id = None
        st.session_state.metadata = None
        st.session_state.scenes = None
        st.session_state.suggestions = None
        st.session_state.workspace_timeline = None
        
        saved_project = load_active_project()
        if saved_project:
            load_project_data(saved_project)

    if 'sequence' not in st.session_state:
        st.session_state.sequence = {'width': 1920, 'height': 1080, 'fps': 30}

    # --- SIDEBAR ---
    with st.sidebar:
        st.header("📁 Project")
        
        try:
            response = requests.get(f"{BACKEND_URL}/projects")
            if response.status_code == 200:
                projects_data = response.json()
                if projects_data['count'] > 0:
                    st.caption(f"{projects_data['count']} project(s) available")
                    
                    project_options = {
                        f"{p['filename'][:20]}... ({p['project_id'][:8]})": p['project_id']
                        for p in projects_data['projects']
                    }
                    
                    if project_options:
                        selected_display = st.selectbox(
                            "Load Project",
                            options=["-- Select --"] + list(project_options.keys()),
                            key="project_selector"
                        )
                        
                        if selected_display != "-- Select --":
                            selected_id = project_options[selected_display]
                            if st.session_state.project_id != selected_id:
                                if st.button("📂 Load Selected Project"):
                                    if load_project_data(selected_id):
                                        st.success("Project loaded!")
                                        st.rerun()
                                    else:
                                        st.error("Failed to load project")
        except:
            pass
        
        st.divider()
        
        if st.session_state.project_id:
            st.success(f"Active: `{st.session_state.project_id[:8]}...`")
            if st.session_state.metadata:
                st.metric("Duration", f"{st.session_state.metadata['duration']:.1f}s")
                st.metric("Resolution", f"{st.session_state.metadata['width']}x{st.session_state.metadata['height']}")
                st.metric("Has Audio", "Yes" if st.session_state.metadata.get('has_audio') else "No")
                
            if st.button("🔄 Refresh Data"):
                if load_project_data(st.session_state.project_id):
                    st.success("Data refreshed!")
                    st.rerun()
        else:
            st.info("No project loaded")
        
        st.divider()
        st.header("📊 Analysis Stats")
        if st.session_state.scenes:
            st.metric("Scenes Detected", len(st.session_state.scenes))
        if st.session_state.suggestions:
            st.metric("Cut Suggestions", len(st.session_state.suggestions))

    # --- MAIN CONTENT ---
    tab1, tab2, tab3, tab4, tab5 = st.tabs(["📤 Upload", "🔎 Analysis", "✂️ Cut Suggestions", "🎛️ Workspace", "📦 Export"])

    # TAB 1: Upload
    with tab1:
        col1, col2 = st.columns([1, 1])
        
        with col1:
            st.subheader("Upload Video")
            uploaded_file = st.file_uploader("Drag and drop your video", type=['mp4', 'mov', 'avi'])

            if uploaded_file is not None:
                if st.button("🚀 Process & Ingest Video", key="upload_btn"):
                    with st.spinner("Uploading and analyzing metadata..."):
                        try:
                            uploaded_file.seek(0)
                            files = {"file": (uploaded_file.name, uploaded_file, uploaded_file.type)}
                            response = requests.post(f"{BACKEND_URL}/upload-video", files=files)
                            
                            if response.status_code == 200:
                                data = response.json()
                                st.session_state.project_id = data['project_id']
                                st.session_state.metadata = data['metadata']
                                st.session_state.scenes = None
                                st.session_state.suggestions = None
                                st.session_state.workspace_timeline = None
                                save_active_project(data['project_id'])
                                st.toast("Upload Successful!", icon="✅")
                                st.rerun()
                            else:
                                st.error(f"Error: {response.text}")
                        except requests.exceptions.ConnectionError:
                            st.error("❌ Cannot connect to backend. Is it running?")
                        except Exception as e:
                            st.error(f"Error: {e}")
        
        with col2:
            if uploaded_file:
                st.subheader("Preview")
                st.video(uploaded_file)

    # TAB 2: Analysis
    with tab2:
        if not st.session_state.project_id:
            st.warning("⚠️ Please upload a video first in the Upload tab.")
        else:
            st.subheader("Scene Detection")
            
            if st.button("🔎 Detect Scenes", key="detect_btn", use_container_width=True):
                with st.spinner("Analyzing video for scene changes..."):
                    try:
                        response = requests.post(f"{BACKEND_URL}/analyze-scenes/{st.session_state.project_id}")
                        if response.status_code == 200:
                            data = response.json()
                            st.session_state.scenes = data['scenes']
                            st.session_state.suggestions = None
                            st.success(f"✅ Detected {data['scene_count']} scenes!")
                        else:
                            st.error(f"Analysis failed: {response.text}")
                    except Exception as e:
                        st.error(f"Error: {e}")
            
            if st.session_state.scenes:
                st.divider()
                st.subheader("🎬 Scene Timeline")
                
                df = pd.DataFrame(st.session_state.scenes)
                display_df = df[['scene_id', 'start_time', 'end_time']].copy()
                display_df['duration'] = display_df['end_time'] - display_df['start_time']
                
                def format_precise_time(seconds):
                    mins = int(seconds // 60)
                    secs = int(seconds % 60)
                    ms = int((seconds % 1) * 1000)
                    return f"{mins:02d}:{secs:02d}.{ms:03d}"
                
                display_df['start_time'] = display_df['start_time'].apply(format_precise_time)
                display_df['end_time'] = display_df['end_time'].apply(format_precise_time)
                display_df['duration'] = display_df['duration'].apply(lambda x: f"{x:.3f}s")
                
                st.dataframe(display_df, use_container_width=True, hide_index=True)
                
                chart_df = pd.DataFrame(st.session_state.scenes)
                chart_df['duration'] = chart_df['end_time'] - chart_df['start_time']
                st.bar_chart(chart_df.set_index('scene_id')['duration'])

    # TAB 3: Cut Suggestions
    with tab3:
        if not st.session_state.project_id:
            st.warning("⚠️ Please upload a video first.")
        elif not st.session_state.scenes:
            st.warning("⚠️ Please run scene detection first in the Analysis tab.")
        else:
            st.subheader("Smart Cut Suggestions")
            st.caption("🎵 Audio-aware analysis • Motion detection • Face recognition")
            
            if st.button("✂️ Generate Cut Suggestions", key="suggest_btn", use_container_width=True):
                with st.spinner("Analyzing scenes with audio awareness... This may take a moment."):
                    try:
                        response = requests.post(f"{BACKEND_URL}/suggest-cuts/{st.session_state.project_id}")
                        if response.status_code == 200:
                            data = response.json()
                            st.session_state.suggestions = data['suggestions']
                            if data['suggestion_count'] > 0:
                                st.success(f"✅ Generated {data['suggestion_count']} audio-aware cut suggestions!")
                            else:
                                st.info("ℹ️ No cuts suggested - your video looks good!")
                        else:
                            st.error(f"Failed: {response.text}")
                    except Exception as e:
                        st.error(f"Error: {e}")
            
            if st.session_state.suggestions is not None:
                st.divider()
                
                if len(st.session_state.suggestions) == 0:
                    st.info("🎉 No cuts suggested. Your video content appears engaging throughout!")
                else:
                    st.markdown("**Audio Labels Legend:**")
                    legend_cols = st.columns(4)
                    with legend_cols[0]:
                        st.caption("🔇 Silence Detected")
                    with legend_cols[1]:
                        st.caption("🎵 Audio Peak")
                    with legend_cols[2]:
                        st.caption("🔊 High Energy")
                    with legend_cols[3]:
                        st.caption("📉 Low Energy")
                    
                    st.divider()
                    st.subheader(f"📋 {len(st.session_state.suggestions)} Suggestions")
                    
                    if 'accepted_states' not in st.session_state:
                        st.session_state.accepted_states = {}
                    
                    accepted_cuts = []
                    for i, suggestion in enumerate(st.session_state.suggestions):
                        accepted = render_suggestion_card(suggestion, i)
                        st.session_state.accepted_states[suggestion['scene_id']] = accepted
                        if accepted:
                            accepted_cuts.append(suggestion)
                    
                    st.divider()
                    
                    st.subheader("📈 Summary")
                    col1, col2, col3 = st.columns(3)
                    with col1:
                        st.metric("Accepted", f"{len(accepted_cuts)} / {len(st.session_state.suggestions)}")
                    with col2:
                        if accepted_cuts:
                            total_cut_time = sum(s['metrics']['duration'] for s in accepted_cuts)
                            st.metric("Total Cut Time", f"{total_cut_time:.1f}s")
                    with col3:
                        if accepted_cuts:
                            avg_conf = sum(s['confidence'] for s in accepted_cuts) / len(accepted_cuts)
                            st.metric("Avg Confidence", f"{avg_conf:.0%}")

    # TAB 4: Workspace
    with tab4:
        st.subheader("🎛️ Workspace")
        st.caption("Manual video editing environment • Build your timeline")
        
        # --- DATA SYNC & RESTORE ---
        if not st.session_state.get('workspace_scenes') and st.session_state.get('scenes'):
            st.session_state.workspace_scenes = []
            for s in st.session_state.scenes:
                if 'duration' not in s: s['duration'] = s['end_time'] - s['start_time']
                st.session_state.workspace_scenes.append(s)
            
        if not st.session_state.project_id:
            st.warning("⚠️ Please upload a video first.")
        else:
            # Load workspace timeline
            if st.session_state.workspace_timeline is None:
                loaded = load_workspace_timeline(st.session_state.project_id)
                if not loaded:
                    # AUTO-POPULATE from scenes if available
                    if st.session_state.get('workspace_scenes'):
                        st.session_state.workspace_timeline = convert_scenes_to_timeline(
                            st.session_state.workspace_scenes, 
                            st.session_state.project_id
                        )
                        st.toast("Auto-populated timeline from scenes", icon="🎞️")
                    else:
                        st.session_state.workspace_timeline = {
                            "clips": [], "duration": 0, "transitions": []
                        }
            
            # === 4-PANEL LAYOUT ===
            row1_col1, row1_col2, row1_col3 = st.columns([1, 2.5, 1.2], gap="medium")
            
            # --- LEFT: MEDIA LIBRARY ---
            with row1_col1:
                st.markdown("#### 📂 Media")
                media_tab1, media_tab2 = st.tabs(["Scenes", "Library"])
                
                with media_tab1: # Current Project Scenes
                    with st.container(height=400, border=True):
                        if st.session_state.workspace_scenes:
                            scene_cols = st.columns(2)
                            for i, s in enumerate(st.session_state.workspace_scenes):
                                with scene_cols[i % 2]:
                                    st.markdown(f"""<div style="background:#262730;border:1px solid #444;border-radius:6px;padding:8px;text-align:center;">
                                       <div style="font-size:24px;">🎬</div>
                                       <div style="font-size:10px;">Scene {s['scene_id']}</div>
                                       <div style="font-size:9px;color:#888;">{s['duration']:.1f}s</div>
                                    </div>""", unsafe_allow_html=True)
                        else:
                            st.info("No scenes")
                            
                with media_tab2: # Global Library
                    st.info("Global Library")

            # --- CENTER: PREVIEW ---
            with row1_col2:
                st.markdown("#### 🎬 Preview")
                container_h = 400
                
                # Canvas Logic (Aspect Ratio)
                seq_w = st.session_state.sequence['width']
                seq_h = st.session_state.sequence['height']
                ar_val = seq_w / seq_h
                
                # HTML Canvas
                st.components.v1.html(f"""
                <div style="
                    display: flex; justify-content: center; align-items: center;
                    height: {container_h}px; background-color: #000;
                ">
                    <div style="
                        aspect-ratio: {ar_val};
                        height: 90%; max-width: 100%;
                        background: #111; border: 1px solid #333;
                        display: flex; justify-content: center; align-items: center;
                        color: #555; font-family: sans-serif;
                    ">
                        {seq_w}x{seq_h}<br>Preview Canvas
                    </div>
                </div>
                """, height=container_h)

            # --- RIGHT: INSPECTOR ---
            with row1_col3:
                st.markdown("#### ⚙️ Inspector")
                st.caption("Settings")
                st.session_state.sequence['width'] = st.number_input("Width", value=st.session_state.sequence['width'])
                st.session_state.sequence['height'] = st.number_input("Height", value=st.session_state.sequence['height'])

            st.divider()

            # --- BOTTOM: TIMELINE ---
            if st.session_state.workspace_timeline:
                clips = st.session_state.workspace_timeline.get('clips', [])
                total_duration = st.session_state.workspace_timeline.get('duration', 0)
                video_dur = st.session_state.metadata.get('duration', 60.0) if st.session_state.metadata else 60.0

                # VISUAL HTML TIMELINE
                if clips:
                    st.markdown("### 🎞️ Visual Timeline")
                    zoom = st.slider("🔍 Zoom (px/sec)", 10, 200, 50, key="tl_zoom")
                    
                    html_blocks = []
                    current_x = 0
                    colors = ["#FF4B4B", "#FFA421", "#FFE312", "#00D4B1", "#0083B8"]
                    
                    for i, clip in enumerate(clips):
                        c_dur = clip.get('duration', 5.0)
                        block_w = c_dur * zoom
                        color = colors[i % len(colors)]
                        safe_label = clip['label'].replace("'", "")
                        
                        html_blocks.append(f"""
                        <div style="position:absolute;left:{current_x}px;top:5px;width:{block_w}px;height:40px;background:{color};opacity:0.9;border-radius:4px;padding:4px;font-size:10px;font-weight:bold;color:#111;overflow:hidden;white-space:nowrap;" title="{safe_label}">
                            {safe_label}
                        </div>
                        """)
                        current_x += block_w
                    
                    st.components.v1.html(f"""
                    <div style="width:100%;overflow-x:auto;background:#1a1c24;height:60px;position:relative;border:1px solid #333;">
                        <div style="width:{max(current_x+100, 100)}px;height:100%;position:relative;">
                             {''.join(html_blocks)}
                        </div>
                    </div>
                    """, height=80)
                
                st.divider()
                
                # Clip List with Controls
                for i, clip in enumerate(clips):
                    prev_end = clips[i-1]['end_seconds'] if i > 0 else 0.0
                    next_start = clips[i+1]['start_seconds'] if i < len(clips)-1 else video_dur
                    render_timeline_clip(clip, i, video_dur, prev_bound=prev_end, next_bound=next_start)

     # TAB 5: Export (Remained outside)
     
    # TAB 5: Export (Reconnecting to existing flow)
    # TAB 5: Export
    with tab5:
        st.subheader("📦 Export Timeline")
        st.caption("Export your cut suggestions as a non-destructive timeline file")
        
        if not st.session_state.project_id:
            st.warning("⚠️ Please upload a video first.")
        elif not st.session_state.suggestions:
            st.warning("⚠️ Please generate cut suggestions first.")
        else:
            st.success(f"✅ Ready to export timeline for project `{st.session_state.project_id[:8]}...`")
            
            accepted_ids = []
            if 'accepted_states' in st.session_state:
                accepted_ids = [
                    scene_id for scene_id, accepted in st.session_state.accepted_states.items()
                    if accepted
                ]
            
            if not accepted_ids:
                accepted_ids = [s['scene_id'] for s in st.session_state.suggestions]
            
            st.info(f"📋 {len(accepted_ids)} accepted suggestions will be included in the export")
            
            st.divider()
            
            st.markdown("### Export Formats")
            
            col1, col2 = st.columns(2)
            
            with col1:
                st.markdown("#### 📄 JSON Timeline")
                st.caption("Editor-agnostic, structured format.")
                
                accepted_ids_str = ",".join(str(x) for x in accepted_ids)
                
                if st.button("📥 Generate JSON", key="gen_json", use_container_width=True):
                    with st.spinner("Generating JSON timeline..."):
                        try:
                            response = requests.get(
                                f"{BACKEND_URL}/export-timeline/{st.session_state.project_id}",
                                params={"format": "json", "accepted_ids": accepted_ids_str}
                            )
                            if response.status_code == 200:
                                st.session_state.json_export = response.text
                                st.success("✅ JSON timeline generated!")
                            else:
                                st.error(f"Failed: {response.text}")
                        except Exception as e:
                            st.error(f"Error: {e}")
                
                if 'json_export' in st.session_state and st.session_state.json_export:
                    st.download_button(
                        label="⬇️ Download JSON Timeline",
                        data=st.session_state.json_export,
                        file_name=f"cutlab_timeline_{st.session_state.project_id[:8]}.json",
                        mime="application/json",
                        use_container_width=True
                    )
            
            with col2:
                st.markdown("#### 📝 XML Timeline")
                st.caption("Compatible with Premiere Pro, DaVinci Resolve.")
                
                if st.button("📥 Generate XML", key="gen_xml", use_container_width=True):
                    with st.spinner("Generating XML timeline..."):
                        try:
                            response = requests.get(
                                f"{BACKEND_URL}/export-timeline/{st.session_state.project_id}",
                                params={"format": "xml", "accepted_ids": accepted_ids_str}
                            )
                            if response.status_code == 200:
                                st.session_state.xml_export = response.text
                                st.success("✅ XML timeline generated!")
                            else:
                                st.error(f"Failed: {response.text}")
                        except Exception as e:
                            st.error(f"Error: {e}")
                
                if 'xml_export' in st.session_state and st.session_state.xml_export:
                    st.download_button(
                        label="⬇️ Download XML Timeline",
                        data=st.session_state.xml_export,
                        file_name=f"cutlab_timeline_{st.session_state.project_id[:8]}.xml",
                        mime="application/xml",
                        use_container_width=True
                    )


if __name__ == "__main__":
    main()
