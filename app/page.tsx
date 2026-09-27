import { FlatSearchForm } from "@/components/FlatSearchForm";
export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">GOOD HOMES START WITH GOOD FITS</span>
          <h1>
            Your next place.
            <br />
            Your kind of <em>people.</em>
          </h1>
          <p>
            Find a New York flat. Meet roommates whose habits fit yours. Talk
            through the little things before they become big things.
          </p>
          <div className="mini-steps">
            <span>
              01 <b>Find your flat</b>
            </span>
            <span>
              02 <b>Compare habits</b>
            </span>
            <span>
              03 <b>Talk it through</b>
            </span>
          </div>
          <div className="city-art" aria-hidden="true">
            <div className="sun" />
            <div className="building b1" />
            <div className="building b2" />
            <div className="building b3" />
            <div className="building b4" />
            <span className="city-caption">
              A little more in common. A lot more at home.
            </span>
          </div>
        </div>
        <section className="card search-card">
          <span className="eyebrow">FIRST, FIND YOUR PLACE</span>
          <h2>Where feels like home?</h2>
          <p>Start with a neighborhood and a budget.</p>
          <FlatSearchForm />
        </section>
      </section>
      <section className="intro-strip">
        <div>
          <b>Real apartment searches</b>
          <p>Fresh results with links to the original listings.</p>
        </div>
        <div>
          <b>15 different personalities</b>
          <p>Fictional roommates with real-life living preferences.</p>
        </div>
        <div>
          <b>A better conversation</b>
          <p>AI simulations help you explore boundaries and compromises.</p>
        </div>
      </section>
    </>
  );
}
