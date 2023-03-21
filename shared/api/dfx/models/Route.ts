import { BuyRoute, BuyRouteDto, fromBuyRouteDto } from './BuyRoute';
import { fromSellRouteDto, SellRoute, SellRouteDto } from './SellRoute';

export interface RoutesDto {
  buy: BuyRouteDto[];
  sell: SellRouteDto[];
}

export interface Routes {
  buy: BuyRoute[];
  sell: SellRoute[];
}

export const fromRoutesDto = (route: RoutesDto): Routes => ({
  buy: route.buy.map((b) => fromBuyRouteDto(b)),
  sell: route.sell.map((b) => fromSellRouteDto(b)),
});
