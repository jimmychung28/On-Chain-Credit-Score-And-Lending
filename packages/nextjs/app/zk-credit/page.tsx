import type { NextPage } from "next";
import { ZKCreditInterface } from "~~/components/ZKCreditInterface";

const ZKCreditPage: NextPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <ZKCreditInterface />
    </div>
  );
};

export default ZKCreditPage;
