import * as React from 'react';

interface LogoProps {
  imageUrl: string;
  altText: string;
}

const Logo: React.FC<LogoProps> = ({ imageUrl, altText }) => {
  return (
    <div className="flex z-10 flex-col justify-center items-start px-8 py-7 bg-white max-md:px-5 max-md:max-w-full">
      <img
        loading="lazy"
        src={imageUrl}
        alt={altText}
        className="object-contain w-56 max-w-full aspect-[5.46]"
      />
    </div>
  );
};

export const Navbar: React.FC = () => {
  return (
    <nav className="w-full bg-white shadow-sm">
      <div className="max-w-7xl mx-auto">
        <Logo
          imageUrl="https://cdn.builder.io/api/v1/image/assets/15e77c7c76c740da9eda9e882a44a213/420155349e6308775ebfb983a34c128993459367208ac08ec6661da399a2a9e2?apiKey=15e77c7c76c740da9eda9e882a44a213&"
          altText="Company Logo"
        />
      </div>
    </nav>
  );
};
