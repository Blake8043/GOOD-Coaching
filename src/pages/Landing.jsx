import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="pp-page px-6 pt-32 pb-16">
      <section className="mx-auto max-w-5xl text-center">
        <p className="pp-kicker">GOOD Coaching</p>
        <h1 className="text-5xl font-black text-[#12372a] md:text-7xl">Online pickleball coaching made simple.</h1>
        <p className="mx-auto mt-6 max-w-xl text-xl leading-8 text-[#5f746c]">Upload focused match footage, connect with a coach, and receive actionable feedback from anywhere.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/coaches" className="pp-btn-primary px-6 py-3">Browse Coaches</Link>
          <Link to="/services" className="pp-btn-secondary px-6 py-3">Training Options</Link>
        </div>
      </section>
    </div>
  );
}
