export type ParkingCardLayout = {
  imageHeight: number;
  imageWidth: `${number}%`;
  narrow: boolean;
};

export function getParkingCardLayout(width: number): ParkingCardLayout {
  const narrow = width < 370;
  return {
    imageHeight: narrow ? 180 : 190,
    imageWidth: narrow ? '36%' : '39%',
    narrow,
  };
}
