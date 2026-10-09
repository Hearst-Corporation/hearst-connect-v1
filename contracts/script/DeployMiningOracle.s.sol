// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {HearstMiningOracle} from "../src/HearstMiningOracle.sol";

/// Déploie l'oracle de l'économie du minage.
///   REGISTRY_ADMIN       gouvernance (multisig Safe) : paramètres du parc et rôles
///   REGISTRY_PUBLISHER   clé opérationnelle qui publie les relevés du réseau
///   BTC_USD_FEED         flux Chainlink BTC/USD (vide = le cours est publié avec les relevés)
///                        Sepolia 0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43 · mainnet 0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c
///   POWER_USD_PER_KWH_E6 prix de l'électricité (défaut 65 000 = 0,065 $/kWh)
///   EFFICIENCY_JTH_E2    rendement des machines (défaut 1 100 = 11 J/TH)
///   HARDWARE_USD_PER_THS_E6  coût machine par TH/s (défaut 11 200 000 = 11,20 $)
///   AMORTIZATION_DAYS    amortissement (défaut 1 460 = 4 ans)
///   MAX_AGE              fraîcheur maximale d'un relevé, en secondes (défaut 86 400)
/// Exemple (Sepolia) : forge script script/DeployMiningOracle.s.sol --rpc-url sepolia --account hearst-deployer --broadcast --verify
contract DeployMiningOracle is Script {
    function run() external returns (HearstMiningOracle oracle) {
        address admin = vm.envAddress("REGISTRY_ADMIN");
        address publisher = vm.envAddress("REGISTRY_PUBLISHER");
        address feed = vm.envOr("BTC_USD_FEED", address(0));
        HearstMiningOracle.Terms memory terms = HearstMiningOracle.Terms({
            powerUsdPerKwhE6: uint32(vm.envOr("POWER_USD_PER_KWH_E6", uint256(65_000))),
            efficiencyJthE2: uint32(vm.envOr("EFFICIENCY_JTH_E2", uint256(1100))),
            hardwareUsdPerThsE6: uint64(vm.envOr("HARDWARE_USD_PER_THS_E6", uint256(11_200_000))),
            amortizationDays: uint16(vm.envOr("AMORTIZATION_DAYS", uint256(1460))),
            maxAge: uint32(vm.envOr("MAX_AGE", uint256(1 days)))
        });

        vm.startBroadcast();
        oracle = new HearstMiningOracle(admin, publisher, feed, terms);
        vm.stopBroadcast();

        console.log("HearstMiningOracle :", address(oracle));
        console.log("  admin     :", admin);
        console.log("  publisher :", publisher);
        console.log("  flux BTC/USD :", feed);
    }
}
