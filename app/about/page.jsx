import Team from "./_components/Team";

export default function AboutPage() {
  return (
    <div className="px-6">
      <div>
        <h1 className="text-xl lg:text-3xl p-10 font-bold">Welcome to Inspektorat V</h1>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        {/* <UnderConstruction /> */}
        <Team
          name={"Korkel 1"}
          imgUrl={
            "https://ngantor.esdm.go.id/drive/f/8fefdc2aa563429fbf34/?dl=1"
          }
        />
        <Team
          name={"Korkel 2"}
          imgUrl={
            "https://ngantor.esdm.go.id/drive/f/8fefdc2aa563429fbf34/?dl=1"
          }
        />
        <Team
          name={"Korkel 3"}
          imgUrl={
            "https://ngantor.esdm.go.id/drive/f/0c7704e944e6445da94f/?dl=1"
          }
        />
        <Team
          name={"Korkel 4"}
          imgUrl={
            "https://ngantor.esdm.go.id/drive/f/8fefdc2aa563429fbf34/?dl=1"
          }
        />
        <Team
          name={"Korkel 5"}
          imgUrl={
            "https://ngantor.esdm.go.id/drive/f/8fefdc2aa563429fbf34/?dl=1"
          }
        />
      </div>
    </div>
  );
}
