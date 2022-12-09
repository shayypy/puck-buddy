import React from 'react';
import { useQuery, QueryClient, QueryClientProvider } from 'react-query';
import { ErrorMessage } from './types/Error';
import { LiveFeed } from './types/LiveFeed';
import { Schedule } from './types/Schedule';

const queryClient = new QueryClient();

const BASE = 'https://statsapi.web.nhl.com/api/v1';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className='bg-black w-screen h-screen overflow-auto'>
        <div className='bg-teal-100 w-full h-full rounded-3xl pt-1 pb-2 px-6 font-black overflow-auto'>
          <Index />
        </div>
      </div>
    </QueryClientProvider>
  );
}

function Index() {
  const gameId = new URLSearchParams(window.location.search).get('gameId');
  if (!gameId) {
    const now = new Date();
    const { data } = useQuery<Schedule>(
      'schedule',
      async () => {
        const response = await fetch(
          `${BASE}/schedule?hydrate=team,linescore&date=${now.getFullYear()}-${
            now.getMonth() + 1
          }-${now.getDate()}`,
          {
            method: 'GET',
          }
        );
        return await response.json();
      },
      {
        // refetchInterval: 10000,
        refetchOnWindowFocus: false,
      }
    );

    return !data ? (
      <BigInfoText>Loading...</BigInfoText>
    ) : !data.dates.length ? (
      <BigInfoText>No games are scheduled today</BigInfoText>
    ) : (
      <div>
        <h1 className='text-5xl mt-4 ml-2'>
          Games today,{' '}
          <span className='text-teal-900'>{now.toLocaleDateString()}</span>
        </h1>
        <div className='flex flex-wrap mt-4 text-2xl text-teal-900 ml-4'>
          {data.dates[0].games.map((game) => {
            return (
              <a key={game.gamePk} href={`/?gameId=${game.gamePk}`}>
                <RoundedBox className='p-3 m-2 w-40'>
                  <div className='flex'>
                    <span className='mx-auto'>
                      {game.teams.away.team.abbreviation}
                    </span>{' '}
                    <span className='mx-auto opacity-30 text-lg'>@</span>{' '}
                    <span className='mx-auto'>
                      {game.teams.home.team.abbreviation}
                    </span>
                  </div>
                  {game.linescore && game.linescore.currentPeriod !== 0 && (
                    <>
                      <hr className='rounded-full border-2 border-teal-600 my-1' />
                      <div className='flex'>
                        <p>
                          {game.linescore.teams.away.goals}
                          <span className='opacity-30 mx-0.5'>-</span>
                          {game.linescore.teams.home.goals}
                        </p>
                        <span className='opacity-30 mx-auto'>•</span>
                        <p>{game.linescore.currentPeriodOrdinal}</p>
                      </div>
                    </>
                  )}
                </RoundedBox>
              </a>
            );
          })}
        </div>
      </div>
    );
  }

  const { data } = useQuery<LiveFeed | ErrorMessage>(
    ['game', gameId],
    async () => {
      const response = await fetch(`${BASE}/game/${gameId}/feed/live`, {
        method: 'GET',
      });
      return await response.json();
    },
    {
      // refetchInterval: 10000,
      refetchOnWindowFocus: false,
    }
  );

  return !data ? (
    <BigInfoText>Loading...</BigInfoText>
  ) : 'message' in data ? (
    <BigInfoText>
      {data.message} <span className='opacity-30'>[{data.messageNumber}]</span>
    </BigInfoText>
  ) : (
    <LiveFeedDisplay data={data} />
  );
}

const LiveFeedDisplay: React.FC<{ data: LiveFeed }> = ({ data }) => {
  const home = data.gameData.teams.home;
  const away = data.gameData.teams.away;
  // const play = data.liveData.plays.currentPlay;
  const linescore = data.liveData.linescore;

  const awayWinning = linescore.teams.away.goals > linescore.teams.home.goals;
  const homeWinning = linescore.teams.home.goals > linescore.teams.away.goals;

  return (
    <div className='w-full'>
      <div className='flex'>
        <div className='mx-auto'>
          <div className='flex'>
            <img
              src={teamLogo(away.id)}
              className='w-32 h-32 mr-4'
              alt={away.name}
            />
            <RoundedBox
              className='text-teal-900 px-4 py-2 text-7xl my-auto'
              winning={awayWinning}
            >
              {away.abbreviation}
            </RoundedBox>
          </div>
          <RoundedBox className='text-center p-5 flex' winning={awayWinning}>
            <p className='text-[10rem] leading-none m-auto'>
              {linescore.teams.away.goals}
            </p>
            <div className='my-auto'>
              <p className='text-4xl text-teal-900'>SHOTS</p>
              <p className='text-8xl'>{linescore.teams.away.shotsOnGoal}</p>
            </div>
          </RoundedBox>
        </div>
        <div className='mt-10 text-center mx-5'>
          <p className='text-teal-600/40 text-4xl'>@</p>
        </div>
        <div className='mx-auto'>
          <div className='flex'>
            <RoundedBox
              className='text-teal-900 px-4 py-2 text-7xl my-auto'
              winning={homeWinning}
            >
              {home.abbreviation}
            </RoundedBox>
            <img
              src={teamLogo(home.id)}
              className='w-32 h-32 ml-4'
              alt={home.name}
            />
          </div>
          <RoundedBox className='text-center p-5 flex' winning={homeWinning}>
            <p className='text-[10rem] leading-none m-auto'>
              {linescore.teams.home.goals}
            </p>
            <div className='my-auto'>
              <p className='text-4xl text-teal-900'>SHOTS</p>
              <p className='text-8xl'>{linescore.teams.home.shotsOnGoal}</p>
            </div>
          </RoundedBox>
        </div>
      </div>
      <RoundedBox className='p-5 mt-4 text-center text-7xl'>
        {linescore.currentPeriodOrdinal} -{' '}
        {linescore.currentPeriodTimeRemaining}
      </RoundedBox>
    </div>
  );
};

const RoundedBox: React.FC<
  React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLDivElement>,
    HTMLDivElement
  > & { winning?: boolean; className?: string }
> = (props) => (
  <div
    {...props}
    className={`${
      props.winning ? 'bg-teal-300/90' : 'bg-teal-600/20'
    } rounded-xl ${props.className ?? ''}`}
  />
);

const BigInfoText: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className='flex w-full h-full'>
    <div className='m-auto text-6xl text-center'>{children}</div>
  </div>
);

const teamLogo = (teamId: number) => {
  return `https://www-league.nhlstatic.com/images/logos/teams-20222023-light/${teamId}.svg`;
};
