"""
Yardly - Streamlit preview
--------------------------
A self-contained Python prototype of the Yardly worker-to-homeowner marketplace.
It mirrors the main flows of the React/Base44 app (post job, browse nearby jobs,
apply, hire, chat, complete + rate, notifications) using in-memory mock data, so
it runs on Streamlit with no Node, no Base44 backend and no extra files.

Run locally:   pip install streamlit && streamlit run app.py
"""

from datetime import date, datetime, timedelta

import streamlit as st

st.set_page_config(page_title="Yardly", page_icon="🌿", layout="wide")

CATEGORIES = [
    "Lawn Mowing", "Leaf Raking", "Snow Removal", "Gardening & Weeding",
    "Hedge Trimming", "Gutter Cleaning", "Power Washing", "Moving Help",
    "Painting", "General Cleanup",
]
START_TIMES = ["Early Morning (6-8am)", "Morning (8-12pm)", "Afternoon (12-5pm)",
               "Evening (5-8pm)", "Anytime"]
DURATIONS = ["< 1 hour", "1-2 hours", "2-4 hours", "Half day", "Full day", "Multi-day"]

# Job lifecycle: Open -> Hired -> Completed
STATUS_BADGE = {"Open": "🟢 Open", "Hired": "🟡 In progress", "Completed": "✅ Completed"}


# --------------------------------------------------------------------------- #
# State
# --------------------------------------------------------------------------- #
def init_state():
    if "ready" in st.session_state:
        return
    today = date.today()
    st.session_state.update(
        ready=True,
        next_id=100,
        homeowner="Jordan (Homeowner)",
        worker="Sam (Worker)",
        jobs=[
            dict(id=1, title="Mow front and back lawn", category="Lawn Mowing",
                 description="About a quarter acre, push mower is fine. Bags provided.",
                 owner="Jordan (Homeowner)", area="Maple Heights", budget=(40, 80),
                 date=today + timedelta(days=2), start="Morning (8-12pm)",
                 duration="1-2 hours", status="Open", applicants=[], hired=None,
                 messages=[], rating=None),
            dict(id=2, title="Rake and bag oak leaves", category="Leaf Raking",
                 description="Large oak in the front yard. About 15 bags worth.",
                 owner="Priya (Homeowner)", area="Oak Park", budget=(60, 120),
                 date=today + timedelta(days=4), start="Afternoon (12-5pm)",
                 duration="2-4 hours", status="Open", applicants=[], hired=None,
                 messages=[], rating=None),
            dict(id=3, title="Clear driveway after snow", category="Snow Removal",
                 description="Two-car driveway plus front walkway. Shovel and salt on site.",
                 owner="Marcus (Homeowner)", area="Lakeview", budget=(30, 60),
                 date=today + timedelta(days=1), start="Early Morning (6-8am)",
                 duration="< 1 hour", status="Open", applicants=[], hired=None,
                 messages=[], rating=None),
        ],
        notifications=[],
    )


def notify(text):
    st.session_state.notifications.insert(0, (datetime.now().strftime("%b %d, %H:%M"), text))


def get_job(job_id):
    return next(j for j in st.session_state.jobs if j["id"] == job_id)


def stars(n):
    return "⭐" * int(n) + "☆" * (5 - int(n))


# --------------------------------------------------------------------------- #
# Shared UI
# --------------------------------------------------------------------------- #
def job_header(job):
    lo, hi = job["budget"]
    st.markdown(f"**{job['title']}**  \n{STATUS_BADGE[job['status']]} · {job['category']}")
    st.caption(
        f"📍 {job['area']}  ·  📅 {job['date']:%a, %b %d}  ·  🕒 {job['start']}  ·  "
        f"⏱ {job['duration']}  ·  💵 ${lo}-${hi}"
    )
    st.write(job["description"])


def chat_box(job, me):
    st.markdown("**Messages**")
    if not job["messages"]:
        st.caption("No messages yet. Say hi!")
    for sender, text in job["messages"]:
        with st.chat_message("user" if sender == me else "assistant"):
            st.markdown(f"**{sender}**: {text}")
    msg = st.chat_input("Type a message", key=f"chat_{job['id']}_{me}")
    if msg:
        job["messages"].append((me, msg))
        st.rerun()


# --------------------------------------------------------------------------- #
# Homeowner
# --------------------------------------------------------------------------- #
def homeowner_post_job():
    me = st.session_state.homeowner
    st.subheader("Post a job")
    with st.form("post_job", clear_on_submit=True):
        category = st.selectbox("Service", CATEGORIES)
        title = st.text_input("Job title", placeholder="e.g. Trim front hedges")
        description = st.text_area("Details", placeholder="What needs to be done?")
        area = st.text_input("General area", placeholder="Neighborhood or city")
        c1, c2, c3 = st.columns(3)
        job_date = c1.date_input("Date", min_value=date.today())
        start = c2.selectbox("Start time", START_TIMES)
        duration = c3.selectbox("Estimated duration", DURATIONS)
        budget = st.slider("Budget range ($)", 10, 500, (50, 150), step=5)
        photos = st.file_uploader("Photos (optional)", accept_multiple_files=True,
                                  type=["png", "jpg", "jpeg"])
        submitted = st.form_submit_button("Publish job", type="primary")
    if submitted:
        if not title or not area:
            st.error("Please add a title and a general area.")
            return
        st.session_state.jobs.append(dict(
            id=st.session_state.next_id, title=title, category=category,
            description=description or "No extra details.", owner=me, area=area,
            budget=budget, date=job_date, start=start, duration=duration,
            status="Open", applicants=[], hired=None, messages=[], rating=None,
            photos=photos,
        ))
        st.session_state.next_id += 1
        st.success("Job published! Workers nearby can now apply.")


def homeowner_my_jobs():
    me = st.session_state.homeowner
    st.subheader("My jobs")
    mine = [j for j in st.session_state.jobs if j["owner"] == me]
    if not mine:
        st.info("You haven't posted any jobs yet.")
        return
    for job in mine:
        with st.container(border=True):
            job_header(job)
            for f in job.get("photos") or []:
                st.image(f, width=160)

            if job["status"] == "Open":
                st.markdown(f"**Applicants ({len(job['applicants'])})**")
                if not job["applicants"]:
                    st.caption("No applicants yet.")
                for app in job["applicants"]:
                    with st.container(border=True):
                        a, b = st.columns([4, 1])
                        a.markdown(f"**{app['name']}** · {stars(app['rating'])} "
                                   f"({app['jobs_done']} jobs)  \n"
                                   f"Offer: **${app['offer']}**  \n_{app['note']}_")
                        if b.button("Hire", key=f"hire_{job['id']}_{app['name']}"):
                            job["status"], job["hired"] = "Hired", app
                            notify(f"{app['name']} was hired for '{job['title']}'.")
                            st.rerun()

            elif job["status"] == "Hired":
                st.markdown(f"**Hired:** {job['hired']['name']} at ${job['hired']['offer']}")
                chat_box(job, me)
                if st.button("Mark complete & pay", key=f"done_{job['id']}"):
                    job["status"] = "Completed"
                    notify(f"'{job['title']}' completed. Payment of ${job['hired']['offer']} sent.")
                    st.rerun()

            else:
                st.markdown(f"**Worker:** {job['hired']['name']}  ·  "
                            f"**Paid:** ${job['hired']['offer']}")
                if job["rating"] is None:
                    r = st.feedback("stars", key=f"rate_{job['id']}")
                    if r is not None:
                        job["rating"] = r + 1
                        st.rerun()
                else:
                    st.write(f"Your rating: {stars(job['rating'])}")


# --------------------------------------------------------------------------- #
# Worker
# --------------------------------------------------------------------------- #
def worker_nearby_jobs():
    me = st.session_state.worker
    st.subheader("Nearby jobs")
    cats = st.multiselect("Filter by service", CATEGORIES)
    max_budget = st.slider("Minimum top-of-range budget ($)", 0, 500, 0, step=10)
    jobs = [j for j in st.session_state.jobs
            if j["status"] == "Open"
            and (not cats or j["category"] in cats)
            and j["budget"][1] >= max_budget]
    if not jobs:
        st.info("No open jobs match your filters.")
    for job in jobs:
        with st.container(border=True):
            job_header(job)
            already = any(a["name"] == me for a in job["applicants"])
            if already:
                st.success("You've applied to this job.")
                continue
            with st.expander("Apply"):
                with st.form(f"apply_{job['id']}"):
                    offer = st.number_input("Your price ($)", 10, 1000, job["budget"][1], step=5)
                    note = st.text_area("Message to homeowner",
                                        placeholder="Tell them why you're a good fit.")
                    if st.form_submit_button("Send application", type="primary"):
                        job["applicants"].append(dict(
                            name=me, offer=int(offer), note=note or "Happy to help!",
                            rating=4.5, jobs_done=12))
                        notify(f"{me} applied to '{job['title']}'.")
                        st.rerun()


def worker_my_work():
    me = st.session_state.worker
    st.subheader("My work")
    applied = [j for j in st.session_state.jobs if any(a["name"] == me for a in j["applicants"])]
    if not applied:
        st.info("You haven't applied to any jobs yet.")
        return
    for job in applied:
        with st.container(border=True):
            job_header(job)
            hired = job["hired"]
            if job["status"] == "Open":
                st.caption("⏳ Waiting on the homeowner.")
            elif hired and hired["name"] == me:
                if job["status"] == "Hired":
                    st.success("You got the job!")
                    chat_box(job, me)
                else:
                    st.success(f"Completed. You earned ${hired['offer']}.")
                    if job["rating"]:
                        st.write(f"Rating received: {stars(job['rating'])}")
            else:
                st.caption("The homeowner chose another worker.")


# --------------------------------------------------------------------------- #
# Sidebar + routing
# --------------------------------------------------------------------------- #
def main():
    init_state()

    with st.sidebar:
        st.title("🌿 Yardly")
        st.caption("Connecting homeowners with local help")
        role = st.radio("Preview as", ["Homeowner", "Worker"], horizontal=True)
        st.divider()
        with st.expander(f"🔔 Notifications ({len(st.session_state.notifications)})"):
            if not st.session_state.notifications:
                st.caption("Nothing yet.")
            for ts, text in st.session_state.notifications[:10]:
                st.caption(f"{ts} · {text}")
        st.divider()
        st.caption("Preview build: in-memory demo data, resets on refresh.")

    if role == "Homeowner":
        tab1, tab2 = st.tabs(["My jobs", "Post a job"])
        with tab1:
            homeowner_my_jobs()
        with tab2:
            homeowner_post_job()
    else:
        tab1, tab2 = st.tabs(["Nearby jobs", "My work"])
        with tab1:
            worker_nearby_jobs()
        with tab2:
            worker_my_work()


main()
