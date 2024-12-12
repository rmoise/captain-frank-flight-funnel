'use client';

import React from 'react';
import { SocialLink } from '@/types';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface FooterProps {
  socialLinks: SocialLink[];
}

export const Footer: React.FC<FooterProps> = ({ socialLinks }) => {
  const matches = useMediaQuery('(min-width: 768px)');

  return (
    <div className="flex justify-center w-full bg-[#2e3e48] overflow-x-hidden">
      <div className="w-full max-w-[428px] lg:max-w-none h-[423px] lg:h-[460px] lg:px-8 xl:px-[260px] flex items-center justify-center">
        <div className="w-full max-w-[320px] lg:max-w-[920px] h-[334.49px] lg:h-[129.99px] relative flex-col justify-start items-center lg:items-start flex">
          {/* Top Section with Copyright and Navigation */}
          <div className="w-full flex flex-col lg:flex-row lg:justify-between items-center lg:items-start">
            {/* Copyright */}
            <div className="w-[309.18px] lg:w-[343.52px] h-[26.50px] lg:h-[29.50px] text-center lg:text-left text-white text-lg lg:text-xl font-light font-['Heebo'] leading-7 lg:leading-[33px]">
              © Copyright Captain Frank GmbH 2024
            </div>

            {/* Navigation Links */}
            <div className="h-[33px] flex items-start justify-between lg:justify-end gap-8 lg:gap-[75.19px] mt-8 lg:mt-0">
              <div className="w-[90.20px] lg:w-[100.22px] flex justify-center items-center">
                <div className="w-[90.54px] lg:w-[100.58px] h-[26.50px] lg:h-[29.50px] text-center text-white text-lg lg:text-xl font-light font-['Heebo'] leading-7 lg:leading-[33px]">
                  Impressum
                </div>
              </div>
              <div className="lg:w-[110.19px] flex justify-center items-center">
                <div className="w-[99.68px] lg:w-[110.73px] h-[26.50px] lg:h-[29.50px] text-center text-white text-lg lg:text-xl font-light font-['Heebo'] leading-7 lg:leading-[33px]">
                  Datenschutz
                </div>
              </div>
              <div className="w-[34.59px] lg:w-[38.44px] flex justify-center items-center">
                <div className="w-[34.89px] lg:w-[38.76px] h-[26.50px] lg:h-[29.50px] text-center text-white text-lg lg:text-xl font-light font-['Heebo'] leading-7 lg:leading-[33px]">
                  AGB
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="w-full lg:w-[899.20px] h-[66.59px] relative border-t border-white mt-8 lg:mt-4">
            {/* Social Links */}
            <div className="flex gap-[33.59px] justify-center lg:justify-start lg:absolute lg:left-0 lg:top-[33px] mt-8 lg:mt-0">
              {socialLinks.map((link) => (
                <div key={link.id} className="w-[33.59px] h-[33.59px]">
                  <img
                    src={link.icon}
                    alt={link.alt}
                    className="w-full h-full object-contain"
                  />
                </div>
              ))}
            </div>

            {/* Company Logo and Trust Score */}
            <div className="flex flex-col items-center lg:items-start lg:absolute lg:right-0 lg:top-[28.19px] mt-8 lg:mt-0">
              <img
                src="https://cdn.builder.io/api/v1/image/assets/15e77c7c76c740da9eda9e882a44a213/ebd239c408ecd1099ae5ae345cadb019e8b9194cf6b57f6363b03d3889cbafec"
                alt="Company logo"
                className="w-[85.25px] lg:w-[129.25px] h-[20.97px] lg:h-[31.80px] object-contain"
              />
              <img
                src="https://cdn.builder.io/api/v1/image/assets/15e77c7c76c740da9eda9e882a44a213/6ef264246fcc0ebe72484231fcea41c712a567b5533c52f82f4e9a7b8d27d1ea"
                alt="Company certification"
                className="w-[145.70px] lg:w-[220.90px] h-[26.70px] lg:h-[40.48px] object-contain mt-2"
              />
              <div className="text-white text-[11px] lg:text-sm font-['Helvetica Neue'] leading-[13.20px] lg:leading-none mt-2">
                TrustScore <span className="font-bold">4.8</span>
                {!matches && <br />}
                {matches && <span> | </span>}
                <span className="font-bold">246</span> Bewertungen
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
